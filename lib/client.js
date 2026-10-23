/**
 * Browser half of 豪霸模式: the 土豪金 switch that sits beside the composer.
 *
 * The host side of `@deepseek-ai/dsh-client-modules` scans every installed
 * package that declares `dsh.client` and ships this file inside its combo
 * script, so it must stay dependency-free apart from `react` — no JSX, no
 * bundler, no imports.
 *
 * @module dsh-haoba-mode/client
 */

window.__ModuleLoader__.load({
	id: 'dsh-haoba-mode',
	factory: (require) => {
		const React = require('react')
		/** Short alias for `React.createElement`. */
		const h = React.createElement

		const SEAT = 'conversation.input.left'
		const ENTRY_ID = 'dsh-haoba-mode-toggle'
		// Keep in sync with lib/protocol.js — the browser half cannot import it.
		const ROUTE_STATE = '/plugins/dsh-haoba-mode/state'
		const STYLE_ID = 'dsh-haoba-mode/toggle.css'
		const GOLD_CLASS = 'dsh-haoba-active'

		const CSS = `
.dsw-hb-toggle {
	--hb-gold-1: #f9e7a0;
	--hb-gold-2: #e8c04a;
	--hb-gold-3: #c9971f;
	--hb-gold-4: #8a6414;
	--hb-ink: #2b1d02;
	position: relative;
	display: inline-flex;
	align-items: center;
	gap: 7px;
	height: 26px;
	padding: 0 8px 0 7px;
	border-radius: 999px;
	border: 1px solid color-mix(in srgb, var(--hb-gold-3) 42%, transparent);
	background: transparent;
	color: var(--dsw-alias-label-secondary, #8a8f98);
	font: inherit;
	font-size: 12px;
	line-height: 1;
	letter-spacing: 0.02em;
	cursor: pointer;
	white-space: nowrap;
	overflow: hidden;
	transition: color 140ms ease, background-color 140ms ease, border-color 140ms ease, box-shadow 160ms ease, opacity 140ms ease;
	-webkit-app-region: no-drag;
}
.dsw-hb-toggle:hover {
	color: var(--hb-gold-3);
	background: color-mix(in srgb, var(--hb-gold-2) 12%, transparent);
	border-color: color-mix(in srgb, var(--hb-gold-3) 62%, transparent);
}
.dsw-hb-toggle:focus-visible {
	outline: 2px solid var(--hb-gold-3);
	outline-offset: 2px;
}
.dsw-hb-toggle[data-state="on"] {
	color: var(--hb-ink);
	background: linear-gradient(135deg, var(--hb-gold-1) 0%, var(--hb-gold-2) 42%, var(--hb-gold-3) 100%);
	border-color: color-mix(in srgb, var(--hb-gold-4) 55%, transparent);
	box-shadow:
		inset 0 0 0 1px rgba(255, 240, 180, 0.55),
		0 1px 2px rgba(60, 40, 0, 0.18),
		0 0 14px color-mix(in srgb, var(--hb-gold-2) 55%, transparent);
	font-weight: 700;
	opacity: 1;
}
.dsw-hb-toggle[data-state="on"]:hover {
	background: linear-gradient(135deg, #fff0b4 0%, var(--hb-gold-2) 45%, var(--hb-gold-3) 100%);
	box-shadow:
		inset 0 0 0 1px rgba(255, 245, 200, 0.7),
		0 1px 2px rgba(60, 40, 0, 0.2),
		0 0 22px color-mix(in srgb, var(--hb-gold-2) 72%, transparent);
}
/* The sweep of light that makes gold read as gold. */
.dsw-hb-toggle[data-state="on"]::after {
	content: "";
	position: absolute;
	inset: 0;
	pointer-events: none;
	background: linear-gradient(105deg, transparent 32%, rgba(255, 255, 255, 0.72) 46%, transparent 60%);
	transform: translateX(-130%);
	animation: dsw-hb-shine 3.6s ease-in-out infinite;
}
@keyframes dsw-hb-shine {
	0%, 62% { transform: translateX(-130%); }
	86%, 100% { transform: translateX(130%); }
}
.dsw-hb-toggle[data-state="error"] {
	color: var(--dsw-alias-state-error-primary, #e5484d);
	border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #e5484d) 55%, transparent);
	background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #e5484d) 12%, transparent);
	opacity: 1;
}
.dsw-hb-toggle[data-busy="true"] {
	cursor: progress;
}
.dsw-hb-toggle svg { flex: none; display: block; }
.dsw-hb-toggle[data-state="on"] .dsw-hb-crown {
	filter: drop-shadow(0 1px 0 rgba(255, 250, 220, 0.7));
}
.dsw-hb-label { display: inline-block; }
.dsw-hb-track {
	position: relative;
	width: 24px;
	height: 13px;
	border-radius: 999px;
	background: color-mix(in srgb, currentColor 22%, transparent);
	box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 18%, transparent);
	flex: none;
	transition: background-color 140ms ease;
}
.dsw-hb-knob {
	position: absolute;
	top: 1.5px;
	left: 1.5px;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: currentColor;
	opacity: 0.85;
	transition: transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 140ms ease, opacity 140ms ease;
}
.dsw-hb-toggle[data-state="on"] .dsw-hb-track {
	background: rgba(43, 29, 2, 0.3);
	box-shadow: inset 0 0 0 1px rgba(43, 29, 2, 0.28);
}
.dsw-hb-toggle[data-state="on"] .dsw-hb-knob {
	transform: translateX(11px);
	background: #fffbe8;
	opacity: 1;
	box-shadow: 0 1px 2px rgba(43, 29, 2, 0.45);
}
.dsw-hb-spinner {
	width: 12px;
	height: 12px;
	border-radius: 50%;
	border: 1.5px solid color-mix(in srgb, currentColor 30%, transparent);
	border-top-color: currentColor;
	animation: dsw-hb-spin 720ms linear infinite;
	flex: none;
}
@keyframes dsw-hb-spin { to { transform: rotate(360deg); } }

/* While the mode is on, the whole shell borrows the gold accent. */
body.${GOLD_CLASS} {
	--dsw-alias-brand-primary: #c9971f;
	--dsw-alias-brand-primary-hover: #d9a520;
}
@media (prefers-reduced-motion: reduce) {
	.dsw-hb-toggle, .dsw-hb-knob, .dsw-hb-track { transition: none; }
	.dsw-hb-toggle[data-state="on"]::after { animation: none; opacity: 0; }
	.dsw-hb-spinner { animation-duration: 2s; }
}
`

		/**
		 * The crown that marks the control.
		 * @returns {object} React element.
		 */
		function Crown() {
			return h('svg', {
				className: 'dsw-hb-crown',
				width: 14,
				height: 14,
				viewBox: '0 0 16 16',
				'aria-hidden': true,
				fill: 'none'
			},
				h('path', {
					d: 'M1.7 4.3l2.9 1.9L8 2.2l3.4 4 2.9-1.9-1.1 7.2H2.8z',
					fill: 'currentColor',
					stroke: 'currentColor',
					strokeWidth: 0.8,
					strokeLinejoin: 'round'
				}),
				h('rect', { x: 3.2, y: 12.4, width: 9.6, height: 1.5, rx: 0.7, fill: 'currentColor' })
			)
		}

		/**
		 * Build the tooltip for one state.
		 * @param {string} state - current state machine value.
		 * @param {string} message - last error text, when any.
		 * @param {object | null} applied - what the last shaped request asked for.
		 * @returns {string} tooltip text.
		 */
		function tooltip(state, message, applied) {
			if (state === 'on') {
				const parts = []
				if (applied !== null && typeof applied === 'object') {
					if (typeof applied.model === 'string') parts.push(applied.model)
					if (typeof applied.reasoningEffort === 'string') parts.push('思考 ' + applied.reasoningEffort)
					if (typeof applied.maxTokens === 'number') parts.push('输出上限 ' + applied.maxTokens)
				}
				const detail = parts.length > 0 ? '\n最近一次：' + parts.join(' · ') : '\n下一条消息起生效。'
				return '豪霸模式已开启：最高推理强度 + 最大输出预算 + 穷尽式工作纪律。' + detail + '\n点击关闭。'
			}
			if (state === 'error') return `开关失败：${message || '未知错误'}（点击重试）`
			return '豪霸模式已关闭。点击开启：把每一步推到模型的最强推理强度与最大输出预算，并额外要求穷尽式交付。'
		}

		/**
		 * The gold switch.
		 *
		 * State machine: `unknown` while the first GET is in flight, then `off` /
		 * `on`; `error` only parks on a failed POST.
		 *
		 * @returns {object} React element.
		 */
		function Toggle() {
			const [status, setStatus] = React.useState('unknown')
			const [busy, setBusy] = React.useState(false)
			const [message, setMessage] = React.useState('')
			const [applied, setApplied] = React.useState(null)
			const alive = React.useRef(true)

			React.useEffect(() => {
				alive.current = true
				fetch(ROUTE_STATE, { credentials: 'same-origin', cache: 'no-store' })
					.then((response) => response.json())
					.then((body) => {
						if (!alive.current) return
						setStatus(body?.enabled === true ? 'on' : 'off')
						setApplied(body?.applied ?? null)
						setMessage(body?.lastError ? String(body.lastError) : '')
					})
					.catch(() => {
						if (alive.current) setStatus('off')
					})
				return () => { alive.current = false }
			}, [])

			const on = status === 'on'

			// Tint the rest of the shell gold while the mode is on.
			React.useEffect(() => {
				const body = document.body
				if (on) body.classList.add(GOLD_CLASS)
				else body.classList.remove(GOLD_CLASS)
				return () => { body.classList.remove(GOLD_CLASS) }
			}, [on])

			const flip = React.useCallback(() => {
				if (busy || status === 'unknown') return
				const next = status !== 'on'
				setBusy(true)
				setStatus(next ? 'on' : 'off')
				fetch(ROUTE_STATE, {
					method: 'POST',
					credentials: 'same-origin',
					cache: 'no-store',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ enabled: next })
				})
					.then(async (response) => {
						const body = await response.json().catch(() => ({}))
						if (!alive.current) return
						if (response.ok && body?.ok === true) {
							setStatus(body.enabled === true ? 'on' : 'off')
							setApplied(body?.applied ?? null)
							setMessage('')
						} else {
							setStatus('error')
							setMessage(String(body?.error ?? `HTTP ${response.status}`))
						}
					})
					.catch((error) => {
						if (!alive.current) return
						setStatus('error')
						setMessage(error instanceof Error ? error.message : String(error))
					})
					.finally(() => { if (alive.current) setBusy(false) })
			}, [busy, status])

			return h('button', {
				type: 'button',
				className: 'dsw-hb-toggle',
				'data-state': status,
				'data-busy': busy ? 'true' : 'false',
				role: 'switch',
				'aria-checked': on,
				'aria-label': on ? '关闭豪霸模式' : '开启豪霸模式',
				title: tooltip(status, message, applied),
				onClick: flip,
				disabled: busy || status === 'unknown'
			},
				busy ? h('span', { className: 'dsw-hb-spinner' }) : h(Crown),
				h('span', { className: 'dsw-hb-label' }, '豪霸'),
				h('span', { className: 'dsw-hb-track' },
					h('span', { className: 'dsw-hb-knob' })
				)
			)
		}

		/**
		 * Inject the stylesheet once, and remove it when the entry is disposed.
		 * @returns {() => void} cleanup.
		 */
		function installStyles() {
			if (document.getElementById(STYLE_ID) !== null) return () => {}
			const style = document.createElement('style')
			style.id = STYLE_ID
			style.textContent = CSS
			document.head.appendChild(style)
			return () => {
				style.remove()
				document.body.classList.remove(GOLD_CLASS)
			}
		}

		/**
		 * Plugin entry point.
		 * @param {object} ctx - client context with `slots`.
		 */
		function apply(ctx) {
			ctx.effect(installStyles, 'haoba-mode toggle styles')
			ctx.slots.inject(SEAT, () => ctx.slots.register({
				name: SEAT,
				id: ENTRY_ID,
				order: 120
			}, Toggle))
		}

		const module = { exports: {} }
		module.exports.apply = apply
		module.exports.inject = ['slots']
		return module.exports
	}
})
