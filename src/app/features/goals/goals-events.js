import { deleteGoalGroup } from '../../../services/goal-service.js';
import { duplicateGoalDraft } from '../../../utils/goal.js';
import { groupGoalRecords } from './goals-data.js';
import { openGoalEditor, resetGoalDraft } from './goal-dialog.js';

export async function handleGoalsClick(event, { state, render, showToast, createDefaultGoalDraft, loadGoalsData }) {
  if (event.target.closest('[data-action="reload-goals"]')) {
    state.goals.loaded = false;
    await loadGoalsData();
    return true;
  }
  const newButton = event.target.closest('[data-goal-new]');
  if (newButton && !newButton.disabled) {
    const storeId = state.profile.role === 'manager' ? state.profile.storeId : state.goals.draft.storeId || state.profile.storeId;
    state.goals.editorOpen = true;
    state.goals.editingGroupId = '';
    state.goals.duplicatingGroupId = '';
    state.goals.draft = createDefaultGoalDraft(storeId);
    render();
    openGoalEditor();
    return true;
  }
  const editButton = event.target.closest('[data-edit-goal]');
  if (editButton && !editButton.disabled) {
    const group = groupGoalRecords(state.goals.records).find((item) => item.id === editButton.dataset.editGoal);
    if (!group) return true;
    state.goals.editorOpen = true;
    state.goals.editingGroupId = group.id;
    state.goals.duplicatingGroupId = '';
    state.goals.draft = { title: group.title, targetCount: group.targetPerPerson, startDate: group.startDate, endDate: group.endDate, storeId: group.storeId, assigneeUids: group.goals.map((goal) => goal.assigneeUid) };
    render();
    openGoalEditor();
    return true;
  }
  const duplicateButton = event.target.closest('[data-duplicate-goal]');
  if (duplicateButton && !duplicateButton.disabled) {
    const group = groupGoalRecords(state.goals.records).find((item) => item.id === duplicateButton.dataset.duplicateGoal);
    if (!group) return true;
    state.goals.editorOpen = true;
    state.goals.editingGroupId = '';
    state.goals.duplicatingGroupId = group.id;
    state.goals.draft = duplicateGoalDraft(group);
    render();
    showToast('Meta duplicada no formulário. Revise e salve.');
    openGoalEditor({ selectTitle: true });
    return true;
  }
  if (event.target.closest('[data-cancel-goal-edit]')) {
    document.querySelector('#goal-editor-dialog')?.close();
    resetGoalDraft(state, createDefaultGoalDraft);
    render();
    return true;
  }
  const deleteButton = event.target.closest('[data-delete-goal]');
  if (deleteButton && !deleteButton.disabled) {
    state.goals.pendingDeleteGroupId = deleteButton.dataset.deleteGoal;
    render();
    requestAnimationFrame(() => document.querySelector('#delete-goal-dialog')?.showModal());
    return true;
  }
  if (event.target.closest('[data-close-goal-dialog]')) {
    event.target.closest('dialog')?.close();
    state.goals.pendingDeleteGroupId = '';
    return true;
  }
  const confirmButton = event.target.closest('[data-confirm-delete-goal]');
  if (confirmButton && !confirmButton.disabled) {
    const group = groupGoalRecords(state.goals.records).find((item) => item.id === confirmButton.dataset.confirmDeleteGoal);
    if (!group) return true;
    confirmButton.disabled = true;
    try {
      await deleteGoalGroup(state.profile, group.goals);
      state.goals.pendingDeleteGroupId = '';
      state.goals.loaded = false;
      await loadGoalsData();
      showToast('Meta excluída.');
    } catch (error) {
      state.goals.pendingDeleteGroupId = '';
      state.goals.error = error?.code === 'permission-denied'
        ? 'Seu perfil não pode excluir esta meta.'
        : 'Não foi possível excluir a meta.';
      render();
    }
    return true;
  }
  return false;
}
