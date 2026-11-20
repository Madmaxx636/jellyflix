/**
 * True for an address that is fine to open in the system browser: http or https. Links like trailers come from the
 * server's metadata, so anything else (file:, smb:, javascript:…) is ignored rather than trusted.
 */
export function isWebUrl(value: string | undefined): value is string {
  if (!value) return false
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
