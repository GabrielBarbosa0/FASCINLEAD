import { createGoals, updateGoalGroup } from '../../../services/goal-service.js';
import { setFieldErrors } from '../../shared/form-helpers.js';
import { groupGoalRecords } from './goals-data.js';

export function resetGoalDraft(state, createDefaultGoalDraft) {
  const storeId = state.profile.role === 'manager' ? state.profile.storeId : state.goals.draft.storeId;
  state.goals.editorOpen = false;
  state.goals.editingGroupId = '';
  state.goals.duplicatingGroupId = '';
  state.goals.draft = createDefaultGoalDraft(storeId);
}

export function openGoalEditor({ focusTitle = true, selectTitle = false } = {}) {
  requestAnimationFrame(() => {
    document.querySelector('#goal-editor-dialog')?.showModal();
    const title = document.querySelector('#goal-title');
    if (focusTitle) title?.focus({ preventScroll: selectTitle });
    if (selectTitle) title?.select();
  });
}

export function bindGoalDialog({ state, render, showToast, createDefaultGoalDraft, loadGoalsData }) {
  const form = document.querySelector('#goal-form');
  if (!form) return;

  const readDraft = () => ({
    title: form.elements.title.value,
    targetCount: Number(form.elements.targetCount.value),
    startDate: form.elements.startDate.value,
    endDate: form.elements.endDate.value,
    storeId: form.elements.storeId.value,
    assigneeUids: new FormData(form).getAll('assigneeUids')
  });
  const closeEditor = () => {
    resetGoalDraft(state, createDefaultGoalDraft);
    render();
  };

  form.elements.storeId.addEventListener('change', () => {
    state.goals.draft = { ...readDraft(), assigneeUids: [] };
    render();
    openGoalEditor({ focusTitle: false });
  });
  form.querySelectorAll('[name="assigneeUids"]').forEach((input) => input.addEventListener('change', () => {
    state.goals.draft = readDraft();
    const count = form.querySelector('[data-goal-selected-count]');
    if (count) count.textContent = `${state.goals.draft.assigneeUids.length} selecionado(s)`;
  }));
  document.querySelector('#goal-editor-dialog')?.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeEditor();
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.goals.saving) return;
    state.goals.draft = readDraft();
    state.goals.saving = true;
    state.goals.error = '';
    setFieldErrors(form, {});
    try {
      const editingGroup = groupGoalRecords(state.goals.records).find((group) => group.id === state.goals.editingGroupId);
      const result = editingGroup
        ? await updateGoalGroup(state.profile, editingGroup.goals, state.goals.draft, state.goals.members)
        : await createGoals(state.profile, state.goals.draft, state.goals.members);
      if (!result.isValid) {
        state.goals.saving = false;
        setFieldErrors(form, result.errors);
        return;
      }
      const createdCount = state.goals.draft.assigneeUids.length;
      const edited = Boolean(editingGroup);
      resetGoalDraft(state, createDefaultGoalDraft);
      state.goals.loaded = false;
      await loadGoalsData();
      showToast(edited ? 'Meta atualizada.' : `${createdCount} meta(s) criada(s).`);
    } catch (error) {
      state.goals.saving = false;
      state.goals.error = error?.code === 'permission-denied'
        ? 'Seu perfil não possui permissão para salvar esta meta.'
        : 'Não foi possível salvar a meta. Verifique a conexão e tente novamente.';
      render();
      openGoalEditor();
    }
  });
}
