import { cleanLocationPath } from '../clean-location-path';

describe('cleanLocationPath', () => {
  it.each([
    [
      'https://reddit.com/r/AICompanion/comments/abc123?utm_source=share&utm_medium=web',
      'https://reddit.com/r/AICompanion/comments/abc123',
    ],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=xyz', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['https://app.example.com/callback#access_token=secret', 'https://app.example.com/callback'],
    ['https://docs.example.com/guide#install', 'https://docs.example.com/guide#install'],
    ['example.com/reset?token=abc&step=2', 'example.com/reset?step=2'],
    ['  /Users/ahe/Documents/launch-post.md  ', '/Users/ahe/Documents/launch-post.md'],
    ['Slack', 'Slack'],
    ['', ''],
  ])('cleans %s', (path, expected) => {
    expect(cleanLocationPath(path)).toBe(expected);
  });
});
