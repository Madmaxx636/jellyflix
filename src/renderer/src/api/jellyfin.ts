// The one place the rest of the app imports the Jellyfin client from. The pieces sit next to it:
//   types.ts    what Jellyfin sends back
//   session.ts  the saved session and this device's identity
//   http.ts     requests, errors and the Authorization header
//   connect.ts  finding the server, signing in, profiles
//   client.ts   the library, playback and image calls
export type * from './types'
export { APP_VERSION, lastServer, loadSession, rememberServer, saveSession } from './session'
export { HttpError, setUnauthorizedHandler } from './http'
export { findServer, login, publicUserImage, publicUsers } from './connect'
export { createApi } from './client'
export type { Api } from './client'
