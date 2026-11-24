/**
 * Thrown when a title can't be played without the server re-encoding it and converting is switched off. It carries the
 * address of the file itself, which another player (mpv, VLC) can open, and what is inside it, for the message.
 */
export class NeedsConversion extends Error {
  constructor(readonly fileUrl: string, readonly container: string, readonly codecs: string[]) {
    super(`This video can't be played here as it is${codecs.length ? ` (${[...new Set(codecs)].join(', ')}${container ? ` in ${container}` : ''})` : ''}, and converting is turned off.`)
    this.name = 'NeedsConversion'
  }
}
