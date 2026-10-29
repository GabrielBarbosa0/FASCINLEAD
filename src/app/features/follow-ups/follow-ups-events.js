export async function handleFollowUpsClick(event, handlers) {
  const captorButton = event.target.closest('[data-follow-up-captor]');
  if (captorButton) {
    handlers.selectCaptor(captorButton.dataset.followUpCaptor);
    return true;
  }

  const closeCaptorButton = event.target.closest('[data-follow-up-captor-close]');
  if (closeCaptorButton) {
    closeCaptorButton.closest('dialog')?.close();
    handlers.closeCaptor();
    return true;
  }

  const filterButton = event.target.closest('[data-follow-up-filter]');
  if (filterButton) {
    handlers.selectFilter(filterButton.dataset.followUpFilter);
    return true;
  }

  const whatsAppLink = event.target.closest('[data-follow-up-whatsapp]');
  if (whatsAppLink) {
    await handlers.openWhatsApp(whatsAppLink.dataset.followUpWhatsapp);
    return true;
  }

  const rescheduleButton = event.target.closest('[data-follow-up-reschedule]');
  if (rescheduleButton) {
    handlers.reschedule(rescheduleButton.dataset.followUpReschedule);
    return true;
  }

  return false;
}
