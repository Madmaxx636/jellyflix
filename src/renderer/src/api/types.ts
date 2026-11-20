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
}
export interface Page { items: Item[]; total: number }
