import { useEffect, useState } from 'react'
import type { Api } from '../api/jellyfin'
import { hueOf } from '../util/library'

const RETRY_AFTER_MS = 1500

/**
 * The profile picture, or the first letter of the name when there isn't one. A picture that fails to load (the server was
 * busy, or the picture was changed since signing in) is asked for again once with the server's current picture tag, and
 * only then given up on, so the button never shows a broken image.
 */
export default function Avatar({ api, name }: { api: Api; name: string }) {
  const [tag, setTag] = useState<string | undefined>(undefined) // undefined: the tag from sign-in
  const [retry, setRetry] = useState(0)
  const [failed, setFailed] = useState(false)
  const url = failed ? '' : api.avatar(tag, retry)

  // Signed in without a picture tag: the picture may have been added since, so ask once.
  useEffect(() => {
    if (api.avatar()) return
    let live = true
    void api.avatarTag().then(t => { if (live && t) setTag(t) })
    return () => { live = false }
  }, [api])

  const onError = () => {
    if (retry > 0) { setFailed(true); return }
    void api.avatarTag().then(t => {
      window.setTimeout(() => { if (t) setTag(t); setRetry(1) }, RETRY_AFTER_MS)
    })
  }

  return url
    ? <img src={url} alt="" onError={onError} />
    : <span style={{ background: `hsl(${hueOf(name)} 55% 42%)` }}>{name.slice(0, 1).toUpperCase()}</span>
}
