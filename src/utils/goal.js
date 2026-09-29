export const GOAL_METRIC = 'leads_captured';

export function validateGoal(values) {
  const title = String(values.title || '').trim();
  const targetCount = Number(values.targetCount);
  const startDate = String(values.startDate || '');
  const endDate = String(values.endDate || '');
  const storeId = String(values.storeId || '');
  const assigneeUids = Array.isArray(values.assigneeUids)
    ? [...new Set(values.assigneeUids.map(String).filter(Boolean))]
    : [];
  const errors = {};

  if (title.length < 3 || title.length > 80) {
    errors.title = 'Informe um titulo entre 3 e 80 caracteres.';
  }

  if (!Number.isInteger(targetCount) || targetCount < 1 || targetCount > 10_000) {
    errors.targetCount = 'Informe uma quantidade inteira entre 1 e 10.000.';
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    errors.startDate = 'Informe a data inicial.';
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    errors.endDate = 'Informe a data final.';
  } else if (startDate && endDate < startDate) {
    errors.endDate = 'A data final deve ser igual ou posterior a inicial.';
  }

  if (!storeId) errors.storeId = 'Escolha uma loja.';
  if (!assigneeUids.length) errors.assigneeUids = 'Selecione pelo menos um colaborador.';

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: { title, targetCount, startDate, endDate, storeId, assigneeUids }
  };
}

export function calculateGoalProgress(goal, leads) {
  const periodStart = new Date(`${goal.startDate}T00:00:00`);
  const periodEnd = new Date(`${goal.endDate}T00:00:00`);
  periodEnd.setDate(periodEnd.getDate() + 1);
  const completed = leads.filter((lead) => {
    const capturedAt = new Date(lead.capturedAtClient);
    return lead.capturedByUid === goal.assigneeUid
      && !Number.isNaN(capturedAt.getTime())
      && capturedAt >= periodStart
      && capturedAt < periodEnd;
  }).length;
  const percentage = Math.min(100, Math.round((completed / goal.targetCount) * 100));

  return {
    ...goal,
    completed,
    remaining: Math.max(0, goal.targetCount - completed),
    percentage
  };
}
