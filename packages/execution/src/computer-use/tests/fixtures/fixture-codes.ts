/** The random values a fixture server run hides in its pages, so a test knows the right answer. */
export interface FixtureCodes {
  readonly heading: string;
  readonly scroll: string;
  readonly zoom: string;
  readonly inboxCount: number;
  readonly password: string;
}
