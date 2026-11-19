import type { ReactNode } from 'react'

export type IconName =
  | 'home' | 'search' | 'plus' | 'check' | 'play' | 'pause' | 'star' | 'film' | 'tv' | 'grid' | 'tag' | 'sliders' | 'user'
  | 'volume' | 'mute' | 'fullscreen' | 'exit-fullscreen' | 'captions' | 'back10' | 'fwd10' | 'speed' | 'next' | 'episodes'
  | 'chevron' | 'x' | 'info' | 'eye' | 'left' | 'right' | 'menu' | 'quality' | 'external' | 'folder'

const solid = { fill: 'currentColor', stroke: 'none' } as const

const shapes: Record<IconName, ReactNode> = {
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  play: <path d="M7 4.5v15l13-7.5z" {...solid} />,
  pause: <path d="M6.5 4h4v16h-4zM13.5 4h4v16h-4z" {...solid} />,
  star: <path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9 6.6 19.8l1.1-6.1L3.2 9.4l6.1-.8z" />,
  film: <path d="M4 4h16v16H4zM8 4v16M16 4v16M4 8.5h4M4 15.5h4M16 8.5h4M16 15.5h4" />,
  tv: <path d="M3 6h18v11H3zM8 21h8M12 17v4" />,
  grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  tag: <><path d="M20.5 12.5l-8 8a1.5 1.5 0 0 1-2.1 0L3 13.1V3h10.1l7.4 7.4a1.5 1.5 0 0 1 0 2.1z" /><circle cx="7.5" cy="7.5" r="1" /></>,
  sliders: <><path d="M4 6h9M19 6h1M4 12h3M13 12h7M4 18h11M21 18h-1" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>,
  volume: <><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" {...solid} /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" /></>,
  mute: <><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" {...solid} /><path d="M16 9.5l5 5M21 9.5l-5 5" /></>,
  fullscreen: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  'exit-fullscreen': <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />,
  captions: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7.5 11.5h3M13.5 11.5h3M7.5 15h5M15 15h1.5" /></>,
  back10: <><path d="M12 5a8 8 0 1 1-8 8" /><path d="M12 1.5L8 5l4 3.5" /><text x="12" y="16.5" fontSize="7" textAnchor="middle" fontWeight="700" {...solid}>10</text></>,
  fwd10: <><path d="M12 5a8 8 0 1 0 8 8" /><path d="M12 1.5L16 5l-4 3.5" /><text x="12" y="16.5" fontSize="7" textAnchor="middle" fontWeight="700" {...solid}>10</text></>,
  speed: <><path d="M4 17a8 8 0 1 1 16 0" /><path d="M12 17l4-5" /></>,
  next: <><path d="M5 5v14l10-7z" {...solid} /><path d="M19 5v14" /></>,
  episodes: <path d="M4 6h16M4 12h16M4 18h9" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.01" /></>,
  eye: <><path d="M2 12s3.7-7 10-7 10 7 10 7-3.7 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  left: <path d="M15 5l-7 7 7 7" />,
  right: <path d="M9 5l7 7-7 7" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  quality: <><rect x="2.5" y="5.5" width="19" height="13" rx="2" /><text x="12" y="15" fontSize="7.5" textAnchor="middle" fontWeight="700" {...solid}>HD</text></>,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  folder: <path d="M3 6a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
}

export default function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>
  )
}
