import type { NavigateFunction } from 'react-router-dom'
import type { Api, Item } from '../api/jellyfin'

/** The Play button on a card or banner: movies and episodes play, a show plays its next episode, anything else opens its page. */
export async function playItem(api: Api, item: Item, nav: NavigateFunction) {
  if (item.Type === 'Movie' || item.Type === 'Episode' || item.Type === 'Video') return nav(`/play/${item.Id}`)
  if (item.Type === 'Series') {
    const ep = await api.nextEpisode(item.Id)
    return nav(ep ? `/play/${ep.Id}` : `/title/${item.Id}`)
  }
  nav(`/title/${item.Id}`)
}

/** Where clicking a card goes: an episode opens its show. */
export const openTarget = (item: Item) => (item.Type === 'Episode' && item.SeriesId ? item.SeriesId : item.Id)

/** True for items that can be played directly. */
export const isPlayable = (item: Item) => item.Type === 'Movie' || item.Type === 'Episode' || item.Type === 'Video' || item.Type === 'Series'
