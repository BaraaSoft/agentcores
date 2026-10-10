const REDACTED = '[redacted]';

/** Replaces every occurrence of each non-empty secret in `text` with `[redacted]`. */
export function redactSecrets(text: string, secrets: readonly string[]): string {
  return secrets
    .filter((secret) => secret.length > 0)
    .reduce((result, secret) => result.split(secret).join(REDACTED), text);
}
