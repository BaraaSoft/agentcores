import { TaskReportParser } from '../../task-report/task-report-parser';
import { normalizeMuseReport } from '../normalize-muse-report';

describe('normalizeMuseReport', () => {
  const museReport = {
    status: 'done',
    summary: 'Signed in. The code is 4821-QX.',
    locationPath: 'portal.acme.test/welcome',
    locationDetails: '',
    blocker: 'null',
    metricReadings: [
      { name: 'code', value: '4821-QX' },
      { name: 'build', value: 7.319 },
      { name: 'unread', value: '12' },
    ],
  };

  it('turns a "null" blocker into null and keeps only numeric metrics', () => {
    expect(normalizeMuseReport(museReport)).toEqual({
      ...museReport,
      blocker: null,
      metricReadings: [
        { name: 'build', value: 7.319 },
        { name: 'unread', value: 12 },
      ],
    });
  });

  it('makes a real Muse report pass the strict report parser', () => {
    const parse = (report: unknown) => new TaskReportParser().parse({ report, finalText: null, isStoppedAtStepLimit: false, secrets: [] });

    expect(parse(museReport).status).toBe('failed');
    expect(parse(normalizeMuseReport(museReport))).toMatchObject({ status: 'done', metricReadings: { build: 7.319, unread: 12 } });
  });

  it('keeps a real blocker', () => {
    const blocker = { kind: 'captcha', detail: 'A puzzle appeared.' };
    expect(normalizeMuseReport({ ...museReport, blocker })).toMatchObject({ blocker });
  });

  it('leaves input that is not an object for the parser to reject', () => {
    expect(normalizeMuseReport('done')).toBe('done');
    expect(normalizeMuseReport(null)).toBeNull();
  });
});
