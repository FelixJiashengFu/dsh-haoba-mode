/**
 * Host half of 豪霸模式 (Haoba Mode).
 *
 * Two jobs, both scoped to the window where the switch is on:
 *  - push every model step to the top of what its own model supports: the
 *    highest reasoning effort the adapter advertises and the model's full
 *    default output-token budget (`agent/request` waterfall);
 *  - keep the working discipline of the mode in the system prompt so the extra
 *    budget is spent on completeness rather than on guessing
 *    (`systemPrompt.section`).
 *
 * The switch itself lives in the browser half; this half owns the persisted
 * state and exposes it over a loopback route next to the toggle.
 *
 * @module dsh-haoba-mode
 */

import { homedir } from 'node:os'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { MODE_TITLE, ROUTE_STATE, SECTION_NAME, SECTION_ORDER } from './protocol.js'
import { HAOBA_PROMPT } from './prompt.js'

export const name = 'haoba-mode'
export const inject = ['webServer']

/** Where the persisted switch state lives. */
const STATE_DIR = join(homedir(), '.dsh')
const STATE_FILE = join(STATE_DIR, 'haoba-mode.json')

/** Largest request body the state route will read. */
const MAX_BODY = 8 * 1024

/** How long one resolved model capability is trusted before asking again. */
const INFO_TTL_MS = 10 * 60 * 1000

/**
 * Strength of the reasoning efforts adapters are known to advertise. Unknown
 * ids are ignored while ranking, and a route that advertises only unknown ids
 * keeps the strongest entry its adapter listed last.
 */
const EFFORT_RANK = {
	none: 0,
	minimal: 1,
	low: 2,
	medium: 3,
	high: 4,
	xhigh: 5,
	max: 6,
	ultra: 7
}

/**
 * Mount the plugin.
 * @param {object} ctx - plugin context with `webServer`, plus optional `llm` and
 * `systemPrompt` services read on demand.
 */
export function apply(ctx) {
	const logger = ctx.logger
	let enabled = false
	let loading = true
	let lastError = null
	/** @type {null | (() => void)} */
	let sectionOff = null
	/** What the last shaped request actually asked for. */
	let lastApplied = null
	/** @type {Map<string, { at: number, value: object }>} */
	const infoCache = new Map()

	/**
	 * Resolve one route's capability metadata, memoised briefly.
	 * @param {string} provider - registered provider route.
	 * @param {string} model - exact model id.
	 * @param {AbortSignal} [signal] - turn cancellation.
	 * @returns {Promise<object | undefined>} adapter metadata, when available.
	 */
	async function resolveInfo(provider, model, signal) {
		const key = provider + '\u0000' + model
		const hit = infoCache.get(key)
		const now = Date.now()
		if (hit !== undefined && now - hit.at < INFO_TTL_MS) return hit.value
		const llm = ctx.get('llm')
		if (llm === undefined || typeof llm.resolveModelInfo !== 'function') return undefined
		const value = await llm.resolveModelInfo(provider, model, signal)
		infoCache.set(key, { at: now, value })
		if (infoCache.size > 32) {
			// Cheap bound: drop the oldest insertion, not the oldest timestamp.
			const oldest = infoCache.keys().next()
			if (!oldest.done) infoCache.delete(oldest.value)
		}
		return value
	}

	/**
	 * The effort ids one route advertises, in adapter order.
	 * @param {object | undefined} info - resolved model metadata.
	 * @returns {string[]} effort ids.
	 */
	function effortIds(info) {
		const efforts = info?.reasoning?.efforts
		if (!Array.isArray(efforts)) return []
		const ids = []
		for (const entry of efforts) {
			const id = typeof entry === 'string' ? entry : entry?.id
			if (typeof id === 'string' && id.length > 0) ids.push(id)
		}
		return ids
	}

	/**
	 * The strongest effort among the advertised ones.
	 * @param {string[]} ids - advertised effort ids.
	 * @returns {string | undefined} the id to request.
	 */
	function pickMaxEffort(ids) {
		if (ids.length === 0) return undefined
		// Adapters list efforts weakest first; use that order when the ids carry
		// no rank this plugin recognises.
		let best = ids[ids.length - 1]
		let bestRank = -1
		for (const id of ids) {
			const rank = EFFORT_RANK[id.toLowerCase()]
			if (rank === undefined) continue
			if (rank >= bestRank) {
				best = id
				bestRank = rank
			}
		}
		return best
	}

	/**
	 * Raise one frozen call configuration to the model's ceiling.
	 * @param {object} base - the configuration the machine would have used.
	 * @param {AbortSignal} [signal] - turn cancellation.
	 * @returns {Promise<object>} the configuration to use instead.
	 */
	async function shape(base, signal) {
		const provider = base?.provider
		const model = base?.model
		if (typeof provider !== 'string' || typeof model !== 'string') return base
		const info = await resolveInfo(provider, model, signal)
		if (info === undefined) return base

		const next = { ...base }
		let changed = false

		const cap = Number(info.defaultMaxTokens)
		if (Number.isFinite(cap) && cap > 0) {
			const ceiling = Math.floor(cap)
			const current = typeof base.maxTokens === 'number' ? base.maxTokens : 0
			if (current < ceiling) {
				next.maxTokens = ceiling
				changed = true
			}
		}

		const effort = pickMaxEffort(effortIds(info))
		if (effort !== undefined && effort !== base.reasoningEffort) {
			next.reasoningEffort = effort
			changed = true
		}

		return changed ? next : base
	}

	/** Register the prompt discipline, once, for as long as the mode is on. */
	function mountSection() {
		if (sectionOff !== null) return
		const service = ctx.get('systemPrompt')
		if (service === undefined || typeof service.section !== 'function') {
			lastError = 'systemPrompt 服务暂不可用，模式只调整了推理强度与输出预算'
			return
		}
		const register = () => service.section({
			name: SECTION_NAME,
			order: SECTION_ORDER,
			text: HAOBA_PROMPT,
			interpolate: false
		})
		sectionOff = typeof ctx.effect === 'function'
			? ctx.effect(register, 'haoba-mode prompt section')
			: register()
		logger?.info?.('haoba-mode: prompt section mounted')
	}

	/** Take the prompt discipline back out. */
	function unmountSection() {
		const off = sectionOff
		sectionOff = null
		if (typeof off === 'function') {
			try { off() } catch { /* already gone */ }
			logger?.info?.('haoba-mode: prompt section unmounted')
		}
	}

	/**
	 * Flip the switch.
	 * @param {boolean} next - desired state.
	 * @returns {Promise<{ enabled: boolean }>} the state now in force.
	 */
	async function setEnabled(next) {
		if (next === enabled) return { enabled }
		enabled = next
		if (next) {
			try { mountSection() } catch (error) { lastError = describe(error) }
		} else {
			unmountSection()
		}
		await saveState(next)
		logger?.info?.(`haoba-mode: ${next ? 'on' : 'off'}`)
		return { enabled }
	}

	// ── The model step ──────────────────────────────────────────────────────

	ctx.on('agent/request', async (payload, next) => {
		const base = await next()
		if (!enabled) return base
		// Self-heal when the prompt service mounted after this plugin did.
		if (sectionOff === null) {
			try { mountSection() } catch { /* reported above */ }
		}
		try {
			const shaped = await shape(base, payload?.signal)
			lastError = null
			if (shaped !== base) {
				lastApplied = {
					provider: shaped.provider,
					model: shaped.model,
					reasoningEffort: shaped.reasoningEffort ?? null,
					maxTokens: shaped.maxTokens ?? null,
					at: Date.now()
				}
			}
			return shaped
		} catch (error) {
			lastError = describe(error)
			logger?.warn?.('haoba-mode: request shaping failed: ' + lastError)
			return base
		}
	})

	// ── Persisted state ─────────────────────────────────────────────────────

	/** @returns {Promise<boolean>} whether the mode was on before the restart. */
	async function loadState() {
		try {
			const raw = await readFile(STATE_FILE, 'utf8')
			const parsed = JSON.parse(raw)
			return parsed?.enabled === true
		} catch {
			return false
		}
	}

	/**
	 * Persist the switch state, ignoring filesystem failures.
	 * @param {boolean} next - desired state.
	 */
	async function saveState(next) {
		try {
			await mkdir(STATE_DIR, { recursive: true })
			const tmp = `${STATE_FILE}.tmp`
			await writeFile(tmp, JSON.stringify({ enabled: next, title: MODE_TITLE }, null, 2), 'utf8')
			await rename(tmp, STATE_FILE)
		} catch (error) {
			logger?.warn?.('haoba-mode: could not persist state: ' + describe(error))
		}
	}

	// ── HTTP surface for the composer switch ────────────────────────────────

	/**
	 * Serialise a JSON reply.
	 * @param {object} res - node response.
	 * @param {number} status - HTTP status.
	 * @param {object} body - payload.
	 */
	function sendJson(res, status, body) {
		const payload = JSON.stringify(body)
		res.writeHead(status, {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'no-store',
			'content-length': Buffer.byteLength(payload)
		})
		res.end(payload)
	}

	/**
	 * Read and decode a small JSON request body.
	 * @param {object} req - node request.
	 * @returns {Promise<object>} decoded body.
	 */
	async function readJson(req) {
		const chunks = []
		let size = 0
		for await (const chunk of req) {
			size += chunk.length
			if (size > MAX_BODY) throw new Error('请求体过大')
			chunks.push(chunk)
		}
		if (size === 0) return {}
		return JSON.parse(Buffer.concat(chunks).toString('utf8'))
	}

	/** @param {object} req - node request. @returns {boolean} loopback only. */
	function isLoopback(req) {
		const address = req.socket?.remoteAddress ?? ''
		return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
	}

	ctx.inject(['webServer'], (webCtx) => {
		webCtx.effect(() => webCtx.webServer.register({
			kind: 'exact',
			path: ROUTE_STATE,
			async handler(req, res) {
				if (!isLoopback(req)) { sendJson(res, 403, { ok: false, error: 'loopback only' }); return }
				try {
					if (req.method === 'GET') {
						sendJson(res, 200, { ok: true, enabled, loading, lastError, applied: lastApplied })
						return
					}
					if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'method not allowed' }); return }
					const body = await readJson(req)
					if (typeof body.enabled !== 'boolean') { sendJson(res, 400, { ok: false, error: 'enabled must be a boolean' }); return }
					await setEnabled(body.enabled)
					sendJson(res, 200, { ok: true, enabled, lastError, applied: lastApplied })
				} catch (error) {
					const message = describe(error)
					lastError = message
					sendJson(res, 500, { ok: false, enabled, error: message })
				}
			}
		}), 'haoba-mode state route')
	})

	ctx.effect(() => () => { unmountSection() }, 'haoba-mode shutdown')

	// Restore the switch after a restart, without blocking plugin start-up.
	void loadState().then(async (wasEnabled) => {
		if (wasEnabled) {
			try {
				await setEnabled(true)
				logger?.info?.('haoba-mode: restored enabled state')
			} catch (error) {
				logger?.warn?.('haoba-mode: could not restore enabled state: ' + describe(error))
			}
		}
		loading = false
	})
}

/**
 * Turn anything into a short message.
 * @param {unknown} error - caught value.
 * @returns {string} message text.
 */
function describe(error) {
	return error instanceof Error ? error.message : String(error)
}
