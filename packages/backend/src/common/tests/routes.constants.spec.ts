import { ADMIN_PREFIX, API_PREFIX, isBackendPath } from '../routes.constants';

describe('the backend route prefixes', () => {
  /**
   * The dashboard fallback compares these against `request.path`, which always starts with one slash.
   * A missing slash, a doubled slash, or a trailing slash hands every API call to the dashboard.
   */
  it.each([API_PREFIX, ADMIN_PREFIX])('%s starts with one slash and does not end with one', (prefix) => {
    expect(prefix).toMatch(/^\/[a-z]+$/);
  });

  it.each(['/api', '/api/workflows', '/api/jobs/abc-123', '/admin', '/admin/queues'])(
    'answers %s from the backend',
    (path) => expect(isBackendPath(path)).toBe(true),
  );

  it.each(['/', '/monitor', '/jobs/abc-123', '/apifoo', '/administration', '/assets/app.js'])(
    'leaves %s to the dashboard',
    (path) => expect(isBackendPath(path)).toBe(false),
  );
});
