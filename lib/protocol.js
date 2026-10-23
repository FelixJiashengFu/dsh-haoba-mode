/**
 * Constants shared by the host half and the browser half.
 *
 * The browser bundle is standalone (no imports), so lib/client.js repeats the
 * route and section identifiers and says so where it does. Keep both copies in
 * sync by editing this file first.
 *
 * @module dsh-haoba-mode/protocol
 */

/** Loopback route the composer switch talks to. */
export const ROUTE_STATE = '/plugins/dsh-haoba-mode/state'

/** Name of the system-prompt section this plugin contributes. */
export const SECTION_NAME = 'haoba-mode'

/**
 * Placement of that section: late, so the working discipline reads as the last
 * instruction the model receives rather than as a preface.
 */
export const SECTION_ORDER = 900

/** Display name of the mode, used in logs and replies. */
export const MODE_TITLE = '豪霸模式'
