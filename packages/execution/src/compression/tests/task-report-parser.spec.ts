import { TaskReportParser } from '../task-report-parser';

const report = (fields: Record<string, unknown>): string => `<task_report>${JSON.stringify(fields)}</task_report>`;

describe('TaskReportParser', () => {
  const parser = new TaskReportParser();

  it('reads a finished report', () => {
    const text = `The reply is posted.\n${report({
      status: 'done',
      summary: 'Reply posted on the top thread.',
      finalLocation: 'Chrome — reddit.com/r/AICompanion',
      blocker: null,
      metricReadings: { upvotes: 12 },
    })}`;
    expect(parser.parse(text, false)).toEqual({
      status: 'done',
      summary: 'Reply posted on the top thread.',
      finalLocation: 'Chrome — reddit.com/r/AICompanion',
      blocker: null,
      metricReadings: { upvotes: 12 },
    });
  });

  it('reads a blocked report with its blocker', () => {
    const text = report({
      status: 'blocked',
      summary: 'A CAPTCHA appeared after clicking Post.',
      blocker: { kind: 'captcha', detail: 'reCAPTCHA on the submit dialog.' },
    });
    expect(parser.parse(text, false)).toMatchObject({
      status: 'blocked',
      blocker: { kind: 'captcha', detail: 'reCAPTCHA on the submit dialog.' },
    });
  });

  it('gives a blocked report without a known blocker kind the kind "other"', () => {
    const text = report({ status: 'blocked', summary: 'Stuck on a strange page.', blocker: { kind: 'alien' } });
    expect(parser.parse(text, false).blocker).toEqual({ kind: 'other', detail: 'Stuck on a strange page.' });
  });

  it('ignores a blocker on a report that is not blocked', () => {
    const text = report({ status: 'done', summary: 'Done.', blocker: { kind: 'captcha', detail: 'x' } });
    expect(parser.parse(text, false).blocker).toBeNull();
  });

  it('treats an unknown status as failed', () => {
    expect(parser.parse(report({ status: 'great', summary: 'Done.' }), false).status).toBe('failed');
  });

  it('drops metric readings that are not numbers', () => {
    const text = report({ status: 'done', summary: 'Done.', metricReadings: { views: '1.2k', replies: 3 } });
    expect(parser.parse(text, false).metricReadings).toEqual({ replies: 3 });
  });

  it('redacts secrets from every returned string', () => {
    const text = report({
      status: 'blocked',
      summary: 'Typed hunter2 into the login form.',
      finalLocation: 'login?pw=hunter2',
      blocker: { kind: 'verification_code', detail: 'Code asked after hunter2 was accepted.' },
    });
    const state = parser.parse(text, false, ['hunter2']);
    expect(JSON.stringify(state)).not.toContain('hunter2');
    expect(state.summary).toBe('Typed [redacted] into the login form.');
  });

  it('fails when the loop hit the step limit', () => {
    expect(parser.parse(report({ status: 'done' }), true)).toMatchObject({ status: 'failed' });
  });

  it('fails without a report, keeping the reply as the summary', () => {
    expect(parser.parse('I could not find the thread.', false)).toEqual({
      status: 'failed',
      summary: 'Finished without a task report: I could not find the thread.',
      finalLocation: '',
      blocker: null,
      metricReadings: {},
    });
  });

  it('fails on invalid JSON', () => {
    expect(parser.parse('<task_report>{not json}</task_report>', false)).toMatchObject({ status: 'failed' });
  });
});
