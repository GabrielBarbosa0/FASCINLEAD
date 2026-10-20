import { describe, expect, it } from 'vitest';
import { calculateGoalProgress, duplicateGoalDraft, validateGoal } from '../../src/utils/goal.js';

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
  it('calculates the percentage and remaining amount for the captor', () => {
    const progress = calculateGoalProgress({
      assigneeUid: 'captor-1',
      targetCount: 20,
      startDate: '2026-10-01',
      endDate: '2026-10-31'
    }, Array.from({ length: 5 }, (_, index) => ({
      capturedByUid: 'captor-1',
      capturedAtClient: `2026-10-${String(index + 1).padStart(2, '0')}T10:00:00.000Z`
    })));

    expect(progress.completed).toBe(5);
    expect(progress.remaining).toBe(15);
    expect(progress.percentage).toBe(25);
  });

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

describe('goal duplication', () => {
  it('copies the configuration and every unique assignee into a new draft', () => {
    const draft = duplicateGoalDraft({
      title: 'Meta de Natal',
      targetPerPerson: 20,
      startDate: '2026-12-01',
      endDate: '2026-12-24',
      storeId: 'loja-02',
      goals: [
        { assigneeUid: 'captor-1' },
        { assigneeUid: 'captor-2' },
        { assigneeUid: 'captor-1' }
      ]
    });

    expect(draft).toEqual({
      title: 'Meta de Natal - copia',
      targetCount: 20,
      startDate: '2026-12-01',
      endDate: '2026-12-24',
      storeId: 'loja-02',
      assigneeUids: ['captor-1', 'captor-2']
    });
  });

  it('preserves the copy suffix inside the title limit', () => {
    const draft = duplicateGoalDraft({
      title: 'A'.repeat(80),
      targetPerPerson: 10,
      goals: []
    });

    expect(draft.title).toHaveLength(80);
    expect(draft.title.endsWith(' - copia')).toBe(true);
  });
});
