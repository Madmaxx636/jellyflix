/** The parts of an hls.js error this app looks at. */
export interface StreamFailure {
  type: string
  details: string
  response?: { code?: number }
}

/** True when the server answered and said no: asking again won't change that. */
export function isRefusal(f: StreamFailure): boolean {
  const code = f.response?.code
  return code === 401 || code === 403 || code === 404
}

/** What to tell the viewer when the stream can't carry on. */
export function describeStreamFailure(f: StreamFailure): string {
  const code = f.response?.code
  if (code === 401 || code === 403) return `The server refused the stream (${code}). Your sign-in may have ended: sign out and sign in again.`
  if (code === 404) return "The server couldn't find a stream for this title (404)."
  if (code && code >= 500) return `The server couldn't prepare the video (${code}). Its transcoding log should say why.`
  if (f.type === 'networkError') return 'The connection to the server was lost while playing.'
  if (f.type === 'mediaError') return "This video couldn't be decoded."
  return `Playback failed (${f.details}).`
}
