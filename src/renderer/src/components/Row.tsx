import { useRef } from 'react'
import { Link } from 'react-router-dom'
import type { Api, Item } from '../api/jellyfin'
import { Card } from './Card'
import Icon from './Icon'

/** A horizontally scrolling row of cards. `ranked` puts a big number beside each (a "Top 10" row). */
export default function Row({ title, items, api, ranked, to }: { title: string; items: Item[]; api: Api; ranked?: boolean; to?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  if (!items.length) return null
  const scroll = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.85, behavior: 'smooth' })
  return (
    <section className={`row ${ranked ? 'ranked-row' : ''}`} data-row={title}>
      <h3>{to ? <Link to={to}>{title}<Icon name="right" size={14} className="row-more" /></Link> : title}</h3>
      <div className="row-wrap">
        <button className="arrow left" onClick={() => scroll(-1)} aria-label="Scroll left"><Icon name="left" size={26} /></button>
        <div className="row-scroll" ref={ref}>
          {items.map((it, i) => ranked
            ? <div className="ranked" key={it.Id}><span className="rank-num">{i + 1}</span><Card item={it} api={api} /></div>
            : <Card key={it.Id} item={it} api={api} />)}
        </div>
        <button className="arrow right" onClick={() => scroll(1)} aria-label="Scroll right"><Icon name="right" size={26} /></button>
      </div>
    </section>
  )
}
