import { describe, expect, it } from 'vitest';
import { kanbanColumns } from '../../src/app/features/kanban/kanban-data.js';

describe('kanban feature modules', () => {
  it('groups leads by their automatic funnel stage', () => {
    const columns = kanbanColumns([
      { id: 'lead-1', fullName: 'Ana', funnelStage: 'awaiting_appointment' },
      { id: 'lead-2', fullName: 'Bruno', funnelStage: 'scheduled', appointmentDate: '2026-11-03', appointmentTime: '08:00' },
      { id: 'lead-3', fullName: 'Carla', funnelStage: 'scheduled', appointmentDate: '2026-11-02', appointmentTime: '08:00' }
    ]);

    expect(columns.find((column) => column.id === 'awaiting_appointment').leads.map((lead) => lead.id)).toEqual(['lead-1']);
    expect(columns.find((column) => column.id === 'scheduled').leads.map((lead) => lead.id)).toEqual(['lead-3', 'lead-2']);
  });
});
