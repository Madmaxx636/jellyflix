import { useState } from 'react'
import { useUpdates } from '../hooks/useUpdates'

/** "A new version is ready": shown once per version until dismissed. Installs that can't update themselves link to the download. */
export default function UpdateBanner() {
  const { info, install } = useUpdates()
  const [dismissed, setDismissed] = useState('')
  const s = info?.state
  if (!s || (s.kind !== 'ready' && s.kind !== 'available') || dismissed === s.version) return null
  return (
    <div className="update-banner" role="status">
      <span>Jellyflix {s.version} {s.kind === 'ready' ? 'is ready to install.' : 'is available.'}</span>
      {s.kind === 'ready'
        ? <button className="btn primary" data-act="restart-update" onClick={install}>Restart now</button>
        : <button className="btn primary" data-act="download-update" onClick={() => window.open(s.url, '_blank')}>Download</button>}
      <button className="btn" data-act="later" onClick={() => setDismissed(s.version)}>Later</button>
    </div>
  )
}
