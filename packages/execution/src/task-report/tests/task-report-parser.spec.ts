import type { TaskReport } from '../task-report.schema';
import { TaskReportParser } from '../task-report-parser';
import type { ParseTaskReportInput } from '../types/parse-task-report-input';

const report = (fields: Partial<TaskReport>): TaskReport => ({
  status: 'done',
  summary: 'Done.',
  finalLocation: 'Chrome — reddit.com',
  blocker: null,
  metricReadings: [],
  ...fields,
});

const input = (fields: Partial<ParseTaskReportInput>): ParseTaskReportInput => ({
  report: null,
  finalText: null,
  isStoppedAtStepLimit: false,
  secrets: [],
  ...fields,
});

describe('TaskReportParser', () => {
  const parser = new TaskReportParser();

  it('reads a finished report', () => {
    const state = parser.parse(
      input({
        report: report({
          summary: 'Reply posted on the top thread.',
          finalLocation: 'Chrome — reddit.com/r/AICompanion',
          metricReadings: [{ name: 'upvotes', value: 12 }],
        }),
      }),
    );
    expect(state).toEqual({
      status: 'done',
      summary: 'Reply posted on the top thread.',
      finalLocation: 'Chrome — reddit.com/r/AICompanion',
      blocker: null,
      metricReadings: { upvotes: 12 },
    });
  });

  it('reads a blocked report with its blocker', () => {
    const blocker = { kind: 'captcha' as const, detail: 'reCAPTCHA on the submit dialog.' };
    const state = parser.parse(input({ report: report({ status: 'blocked', blocker }) }));
    expect(state).toMatchObject({ status: 'blocked', blocker });
  });

  it('gives a blocked report without a blocker the kind "other" and the summary as detail', () => {
    const state = parser.parse(input({ report: report({ status: 'blocked', summary: 'Stuck on a strange page.' }) }));
    expect(state.blocker).toEqual({ kind: 'other', detail: 'Stuck on a strange page.' });
  });

  it('ignores a blocker on a report that is not blocked', () => {
    const state = parser.parse(input({ report: report({ blocker: { kind: 'captcha', detail: 'x' } }) }));
    expect(state.blocker).toBeNull();
  });

  it('fails on a report that does not match the schema', () => {
    const state = parser.parse(input({ report: { ...report({}), status: 'great' } }));
    expect(state).toMatchObject({ status: 'failed', summary: 'The task report did not match its schema.' });
  });

  it('turns metric readings into a map, keeping the last value of a repeated name', () => {
    const metricReadings = [
      { name: 'replies', value: 3 },
      { name: 'views', value: 1200 },
      { name: 'replies', value: 4 },
    ];
    expect(parser.parse(input({ report: report({ metricReadings }) })).metricReadings).toEqual({ replies: 4, views: 1200 });
  });

  it('truncates a long summary', () => {
    const state = parser.parse(input({ report: report({ summary: 'a'.repeat(2000) }) }));
    expect(state.summary).toHaveLength(900);
    expect(state.summary.endsWith('…')).toBe(true);
  });

  it('redacts secrets from every returned string', () => {
    const state = parser.parse(
      input({
        report: report({
          status: 'blocked',
          summary: 'Typed hunter2 into the login form.',
          finalLocation: 'login?pw=hunter2',
          blocker: { kind: 'verification_code', detail: 'Code asked after hunter2 was accepted.' },
        }),
        secrets: ['hunter2'],
      }),
    );
    expect(JSON.stringify(state)).not.toContain('hunter2');
    expect(state.summary).toBe('Typed [redacted] into the login form.');
  });

  it('fails when the loop hit the step limit without a report', () => {
    expect(parser.parse(input({ finalText: 'Scrolling.', isStoppedAtStepLimit: true }))).toMatchObject({
      status: 'failed',
      summary: 'Stopped at the step limit before the instruction was finished.',
    });
  });

  it('fails without a report, keeping the reply as the summary', () => {
    expect(parser.parse(input({ finalText: 'I could not find the thread.' }))).toEqual({
      status: 'failed',
      summary: 'Finished without a task report: I could not find the thread.',
      finalLocation: '',
      blocker: null,
      metricReadings: {},
    });
  });

  it('fails when the model never replied', () => {
    expect(parser.parse(input({}))).toMatchObject({ status: 'failed', summary: 'The execution model never replied.' });
  });
});
