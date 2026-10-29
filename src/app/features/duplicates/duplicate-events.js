export function openDuplicateDialog(state, candidates = []) {
  state.duplicates = {
    ...state.duplicates,
    open: true,
    loading: false,
    error: '',
    candidates
  };
}

export function closeDuplicateDialog(state) {
  state.duplicates = {
    ...state.duplicates,
    open: false,
    loading: false,
    error: '',
    candidates: []
  };
}

export function handleDuplicateDialogClick(event, { state, render, openLead, continueNewLead }) {
  const leadButton = event.target.closest('[data-duplicate-open]');
  if (leadButton) {
    closeDuplicateDialog(state);
    openLead(leadButton.dataset.duplicateOpen);
    return true;
  }
  if (event.target.closest('[data-duplicate-close]')) {
    closeDuplicateDialog(state);
    document.querySelector('#duplicate-dialog')?.close();
    render();
    return true;
  }
  if (event.target.closest('[data-duplicate-continue]')) {
    closeDuplicateDialog(state);
    document.querySelector('#duplicate-dialog')?.close();
    continueNewLead();
    return true;
  }
  return false;
}
