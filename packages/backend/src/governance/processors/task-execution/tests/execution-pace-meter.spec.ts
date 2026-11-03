import { ExecutionPaceMeter } from '../execution-pace-meter';

describe('ExecutionPaceMeter', () => {
  it('counts the screen actions of every turn since the step started, leaving out the report', () => {
    const meter = new ExecutionPaceMeter();
    meter.start();

    meter.recordTurn(['left_click {"coordinate":[10,20]}', 'type {"text":"hi"}', 'screenshot {}']);
    meter.recordTurn(['submit_task_report {"status":"done"}']);

    expect(meter.actionsTaken).toBe(3);
  });

  it('starts each step from zero', () => {
    const meter = new ExecutionPaceMeter();
    meter.start();
    meter.recordTurn(['screenshot {}']);

    meter.start();

    expect(meter.actionsTaken).toBe(0);
  });
});
