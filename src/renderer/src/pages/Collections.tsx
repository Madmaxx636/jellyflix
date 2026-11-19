import type { Api } from '../api/jellyfin'
import { useTheme } from '../theme'
import Browse from '../components/Browse'

const BASE = { types: ['BoxSet'] }

/** Collections (box sets): a franchise or a themed group of titles. */
export default function Collections({ api }: { api: Api }) {
  const { theme } = useTheme()
  return <Browse api={api} title={theme.words.collections} base={BASE} hideFilter empty="No collections yet." />
}
