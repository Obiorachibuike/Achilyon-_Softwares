/**
 * User-generated content sanitization. Achilyon never renders UGC as HTML:
 * content is stored as plain text and React escapes it on render. These
 * helpers normalize text and strip characters that enable spoofing.
 */

// Control chars (except \n and \t), zero-width and bidi override characters.
const UNSAFE_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g

export function sanitizeText(input: string, maxLength = 500): string {
  return input
    .normalize('NFKC')
    .replace(UNSAFE_CHARS, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .slice(0, maxLength)
}

export function sanitizeSingleLine(input: string, maxLength = 80): string {
  return sanitizeText(input, maxLength).replace(/\s+/g, ' ')
}

/** Only allow http(s) URLs; returns undefined for anything else (javascript:, data:, …). */
export function safeUrl(input: string | undefined | null): string | undefined {
  if (!input) return undefined
  try {
    const url = new URL(input.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

export function countLinks(text: string): number {
  // Each alternative consumes the whole link so `https://a.io` counts once, not twice.
  return (text.match(/(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|io|xyz|net|org|gg|app|finance)\b/gi) ?? []).length
}
