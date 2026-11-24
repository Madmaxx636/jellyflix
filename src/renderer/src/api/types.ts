// What Jellyfin sends back, reduced to the fields this app reads.

export interface Session { server: string; token: string; userId: string; userName: string; avatarTag?: string }

export interface Person { Name: string; Id: string; Role?: string; Type?: string; PrimaryImageTag?: string }

export interface MediaStream {
  Index: number
  Type: string // Video | Audio | Subtitle
  Codec?: string
  Language?: string
  DisplayTitle?: string
  Title?: string
  IsDefault?: boolean
  IsForced?: boolean
  IsExternal?: boolean
  IsTextSubtitleStream?: boolean
  Channels?: number
}

export interface MediaSource {
  Id: string
  ETag?: string
  SupportsDirectPlay?: boolean
  SupportsDirectStream?: boolean
  SupportsTranscoding?: boolean
  /** A server-made address for the converted stream, relative to the server. */
  TranscodingUrl?: string
  TranscodingSubProtocol?: string
  RunTimeTicks?: number
  Container?: string
  MediaStreams?: MediaStream[]
  DefaultAudioStreamIndex?: number
  DefaultSubtitleStreamIndex?: number
}

export interface Item {
  Id: string
  Name: string
  Type: string
  Overview?: string
  ProductionYear?: number
  OfficialRating?: string
  RunTimeTicks?: number
  CommunityRating?: number
  Genres?: string[]
  Studios?: { Name: string; Id?: string }[]
  Taglines?: string[]
  People?: Person[]
  RemoteTrailers?: { Url: string; Name?: string }[]
  MediaSources?: MediaSource[]
  DateCreated?: string
  PremiereDate?: string
  ChildCount?: number
  SeriesId?: string
  SeriesName?: string
  ParentIndexNumber?: number
  IndexNumber?: number
  ImageTags?: { Primary?: string; Thumb?: string }
  ParentBackdropItemId?: string
  ParentBackdropImageTags?: string[]
  BackdropImageTags?: string[]
  /** Preview pictures for the seek bar, by media source and then by thumbnail width (Jellyfin 10.9 and later, when the library makes them). */
  Trickplay?: Record<string, Record<string, Trickplay>>
  UserData?: { PlaybackPositionTicks?: number; PlayedPercentage?: number; Played?: boolean; IsFavorite?: boolean }
}

/** A library ("view"): Movies, Shows, Collections… */
export interface View { Id: string; Name: string; CollectionType?: string; Type?: string; ImageTags?: { Primary?: string } }

export interface Recommendation { RecommendationType: string; BaselineItemName?: string; CategoryId?: string; Items: Item[] }

/** A stretch of a video the player can skip (intro, recap, credits…), in seconds. */
export interface Segment { type: string; start: number; end: number }

export interface Prepared { playSessionId: string; source: MediaSource }

export interface PublicUser { Id: string; Name: string; PrimaryImageTag?: string }

export interface PublicInfo { ServerName?: string; Version?: string; ProductName?: string }

export interface Query {
  parentId?: string
  types?: string[]
  genres?: string[]
  filters?: ('IsFavorite' | 'IsUnplayed' | 'IsPlayed')[]
  sortBy?: string
  sortOrder?: 'Ascending' | 'Descending'
  start?: number
  limit?: number
  search?: string
  personId?: string
  tags?: string[]
  /** Leave out the fields only a detail page needs (overview, genres, rating): grids load faster. */
  lean?: boolean
}
export interface Page { items: Item[]; total: number }

/** What the app asks the server for when it starts or changes a stream. */
export interface PlaybackOptions {
  audio?: number
  /** A picture-based subtitle to burn into the picture (text subtitles are shown by the player). */
  subtitle?: number
  /** Highest bits per second, or none. */
  bitrate?: number
  /** False once playing the file as it is has failed. */
  direct?: boolean
}

/** How one title will be played: the address to give the video element, and what the server is doing for it. */
export interface Playback {
  playSessionId: string
  source: MediaSource
  url: string
  /** A file the video element plays itself, or an HLS stream. */
  kind: 'file' | 'hls'
  method: 'DirectPlay' | 'DirectStream' | 'Transcode'
  /** What was asked for, so a later change can tell whether a new stream is needed. */
  asked: PlaybackOptions
}

export interface PlaybackInfoResponse { MediaSources?: MediaSource[]; PlaySessionId?: string; ErrorCode?: string }

/** One set of seek-bar previews: tiles of TileWidth by TileHeight thumbnails, one every Interval milliseconds. */
export interface Trickplay { Width: number; Height: number; TileWidth: number; TileHeight: number; ThumbnailCount: number; Interval: number }
