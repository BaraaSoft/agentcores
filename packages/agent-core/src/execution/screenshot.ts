/**
 * One PNG capture of the display, base64-encoded so it can cross a process or queue boundary as text.
 */
export interface Screenshot {
  readonly mediaType: 'image/png';
  readonly base64: string;
}
