import { describe, expect, it } from 'vitest';
import { calculateGoalProgress, validateGoal } from '../../src/utils/goal.js';

describe('goal validation', () => {
  it('accepts an individual goal assigned to multiple captors', () => {
    const result = validateGoal({
      title: 'Captacoes de outubro',
      targetCount: 25,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      storeId: 'loja-06',
      assigneeUids: ['captor-1', 'captor-2', 'captor-1']
    });

    expect(result.isValid).toBe(true);
    expect(result.data.assigneeUids).toEqual(['captor-1', 'captor-2']);
  });

  it('rejects an inverted period and empty selection', () => {
    const result = validateGoal({
      title: 'Meta mensal',
      targetCount: 10,
      startDate: '2026-10-31',
      endDate: '2026-10-01',
      storeId: 'loja-06',
      assigneeUids: []
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.endDate).toBeTruthy();
    expect(result.errors.assigneeUids).toBeTruthy();
  });
});

describe('goal progress', () => {
  it('counts only leads from the assignee inside the period', () => {
    const progress = calculateGoalProgress({
      assigneeUid: 'captor-1',
      targetCount: 2,
      startDate: '2026-10-01',
      endDate: '2026-10-31'
    }, [
      { capturedByUid: 'captor-1', capturedAtClient: '2026-10-01T10:00:00.000Z' },
      { capturedByUid: 'captor-1', capturedAtClient: '2026-10-31T19:00:00.000Z' },
      { capturedByUid: 'captor-1', capturedAtClient: '2026-11-01T10:00:00.000Z' },
      { capturedByUid: 'captor-2', capturedAtClient: '2026-10-10T10:00:00.000Z' }
    ]);

    expect(progress.completed).toBe(2);
    expect(progress.remaining).toBe(0);
    expect(progress.percentage).toBe(100);
  });
});
