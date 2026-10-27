/** Query parameter names that track the click or carry a credential; never part of a location. */
const DROPPED_PARAM =
  /^(utm_\w+|fbclid|gclid|igshid|si|ref|ref_src|ref_url|token|access_token|auth|code|key|sid|session\w*|password|pw)$/i;

/**
 * Removes tracking and credential query parameters from a location, keeps the ones that identify the
 * page (e.g. YouTube's `v`), and drops a fragment that carries values (e.g. `#access_token=…`).
 * Non-URL locations, such as file paths and app names, come back trimmed and otherwise unchanged.
 */
export function cleanLocationPath(path: string): string {
  const trimmed = path.trim();
  const [beforeFragment, fragment] = splitOnce(trimmed, '#');
  const [base, query] = splitOnce(beforeFragment, '?');

  const kept = query === null ? [] : query.split('&').filter((param) => param !== '' && !DROPPED_PARAM.test(paramName(param)));
  const cleanFragment = fragment === null || fragment.includes('=') ? '' : `#${fragment}`;
  return `${base}${kept.length > 0 ? `?${kept.join('&')}` : ''}${cleanFragment}`;
}

function splitOnce(text: string, separator: string): [string, string | null] {
  const at = text.indexOf(separator);
  return at === -1 ? [text, null] : [text.slice(0, at), text.slice(at + 1)];
}

function paramName(param: string): string {
  const name = param.split('=')[0];
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}
