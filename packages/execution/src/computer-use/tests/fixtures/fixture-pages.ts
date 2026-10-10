import type { FixtureCodes } from './fixture-codes';

const page = (title: string, body: string): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 720px; margin: 48px auto; padding: 0 24px; color: #222; }
  input, button { font-size: 18px; padding: 8px 12px; }
  label { display: block; margin: 16px 0 4px; }
</style>
</head>
<body>
${body}
</body>
</html>`;

/** Builds every fixture page for one server run, keyed by path. */
export function buildFixturePages(codes: FixtureCodes): Readonly<Record<string, string>> {
  const filler = Array.from(
    { length: 60 },
    (_, index) => `<p>Section ${index + 1}. Nothing to see here yet — keep scrolling to the end of the page.</p>`,
  ).join('\n');

  return {
    '/heading': page('AHE fixture', `<h1>AHE fixture ${codes.heading}</h1><p>This page exists for an automated test.</p>`),

    '/scroll': page(
      'Long page',
      `<h1>A long page</h1>\n${filler}\n<h2 id="end">End of page. The code word is ${codes.scroll}.</h2>`,
    ),

    '/zoom': page(
      'Small print',
      `<h1>Terms summary</h1>
<p>Everything important on this page is in the small print below.</p>
<p style="font-size: 7px; color: #999;">Small print reference number: ${codes.zoom}</p>`,
    ),

    '/echo': page(
      'Message box',
      `<h1>Send a message</h1>
<form method="post" action="/echo">
  <label for="message">Message</label>
  <input id="message" name="message" size="40" autocomplete="off">
  <button type="submit">Send</button>
</form>`,
    ),

    '/gate': page(
      'Just a moment',
      `<h1>Verify you are human</h1>
<p>Before continuing to the article, confirm you are not a robot.</p>
<form method="post" action="/verified">
  <label><input type="checkbox" name="human" onchange="this.form.submit()"> I'm not a robot</label>
</form>`,
    ),

    '/login': page(
      'Sign in',
      `<h1>Sign in to Fixture Mail</h1>
<form method="post" action="/login">
  <label for="username">Username</label>
  <input id="username" name="username" autocomplete="off">
  <label for="password">Password</label>
  <input id="password" name="password" type="password" autocomplete="off">
  <p><button type="submit">Sign in</button></p>
</form>`,
    ),

    '/inbox': page('Inbox', `<h1>Welcome, ahe_bot</h1><p>You have ${codes.inboxCount} unread messages.</p>`),
  };
}
