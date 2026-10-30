let disposeScrollbar = () => {};

export function initializeKanbanScrollbar() {
  disposeScrollbar();

  const board = document.querySelector('[data-kanban-board]');
  const scrollbar = document.querySelector('[data-kanban-scrollbar]');
  const track = document.querySelector('[data-kanban-scrollbar-track]');
  if (!board || !scrollbar || !track) return;

  const syncTrackWidth = () => {
    const boardRatio = board.clientWidth / board.scrollWidth;
    track.style.width = `${Math.max(scrollbar.clientWidth, scrollbar.clientWidth / boardRatio)}px`;
    const boardMaxScroll = board.scrollWidth - board.clientWidth;
    const scrollbarMaxScroll = scrollbar.scrollWidth - scrollbar.clientWidth;
    scrollbar.scrollLeft = boardMaxScroll
      ? (board.scrollLeft / boardMaxScroll) * scrollbarMaxScroll
      : 0;
  };

  let frameId = 0;
  const controller = new AbortController();
  const syncBoardPosition = () => {
    if (frameId) return;
    frameId = requestAnimationFrame(() => {
      const scrollbarMaxScroll = scrollbar.scrollWidth - scrollbar.clientWidth;
      const boardMaxScroll = board.scrollWidth - board.clientWidth;
      board.scrollLeft = scrollbarMaxScroll
        ? (scrollbar.scrollLeft / scrollbarMaxScroll) * boardMaxScroll
        : 0;
      frameId = 0;
    });
  };

  const syncAfterResize = () => requestAnimationFrame(syncTrackWidth);
  scrollbar.addEventListener('scroll', syncBoardPosition, { signal: controller.signal });
  window.addEventListener('resize', syncAfterResize, { signal: controller.signal });

  requestAnimationFrame(syncTrackWidth);
  disposeScrollbar = () => {
    controller.abort();
    if (frameId) cancelAnimationFrame(frameId);
    disposeScrollbar = () => {};
  };
}
