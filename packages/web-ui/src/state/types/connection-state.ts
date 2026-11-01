/** Whether the dashboard hears from the backend: before the first answer, while answers arrive, or after a failure. */
export type ConnectionState = 'connecting' | 'live' | 'offline';
