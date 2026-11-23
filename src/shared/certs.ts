export type TrustDecision = 'trusted' | 'ask' | 'ask-changed'

/**
 * What to do about a certificate the system doesn't trust. A server whose certificate the user already trusted is let in as
 * long as it still shows that same certificate. A new server, or a trusted one that now shows a different certificate, is
 * put to the user.
 */
export function decideTrust(trusted: Record<string, string>, host: string, fingerprint: string): TrustDecision {
  const known = trusted[host]
  if (known === undefined) return 'ask'
  return known === fingerprint ? 'trusted' : 'ask-changed'
}
