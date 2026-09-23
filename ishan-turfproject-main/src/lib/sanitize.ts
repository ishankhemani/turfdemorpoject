/**
 * sanitize.ts — Input sanitization helpers for XSS prevention.
 *
 * Use these utilities whenever you render user-supplied content as HTML
 * or pass it to innerHTML. For React JSX, React already escapes values
 * by default — only use these when using dangerouslySetInnerHTML or
 * constructing strings passed to third-party DOM libraries.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}

/**
 * Escape HTML special characters to prevent XSS when inserting
 * user content into HTML strings.
 *
 * @example
 * element.innerHTML = escapeHtml(userInput)  // safe
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return ''
  return String(str).replace(/[&<>"'`=/]/g, (char) => HTML_ESCAPE_MAP[char] ?? char)
}

/**
 * Strip all HTML tags from a string, leaving only plain text.
 * Useful for sanitizing rich-text fields before storing/displaying.
 */
export function stripHtml(str: unknown): string {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // kill scripts first
    .replace(/<[^>]*>/g, '') // strip remaining tags
    .trim()
}

/**
 * Sanitize a URL to allow only http/https schemes.
 * Prevents javascript: and data: URI injections in href/src attributes.
 *
 * @example
 * <a href={sanitizeUrl(userLink)}>...</a>
 */
export function sanitizeUrl(url: unknown): string {
  if (url === null || url === undefined) return '#'
  const str = String(url).trim()
  try {
    const parsed = new URL(str)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return str
    }
  } catch {
    // Not a valid URL — return safe fallback
  }
  return '#'
}

/**
 * Sanitize a plain-text user input for storage:
 * - Trims whitespace
 * - Removes null bytes (database injection prevention)
 * - Limits length to avoid oversized payloads
 */
export function sanitizeText(str: unknown, maxLength = 1000): string {
  if (str === null || str === undefined) return ''
  return String(str)
    .trim()
    .replace(/\0/g, '') // remove null bytes
    .slice(0, maxLength)
}
