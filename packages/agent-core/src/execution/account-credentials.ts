/**
 * Login details for one platform account the owner controls.
 * Supplied by the backend's identity service from its secret store — never from memory,
 * never logged, and redacted from anything the execution layer returns.
 */
export interface AccountCredentials {
  /** The site the account belongs to, e.g. `reddit.com`. The model may only use it there. */
  readonly platform: string;
  readonly username: string;
  readonly password: string;
}
