export async function handleConfirmationClick(event, handlers) {
  const filterButton = event.target.closest('[data-confirmation-filter]');
  if (filterButton) { handlers.selectFilter(filterButton.dataset.confirmationFilter); return true; }
  const doneButton = event.target.closest('[data-confirmation-done]');
  if (doneButton && !doneButton.disabled) { await handlers.markDone(doneButton.dataset.confirmationDone); return true; }
  const undoButton = event.target.closest('[data-confirmation-undo]');
  if (undoButton && !undoButton.disabled) { await handlers.undo(undoButton.dataset.confirmationUndo); return true; }
  return false;
}
