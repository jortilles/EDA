/**
 * Shared ResizeObserver setup for D3 charts: sizes the SVG from the container's contentRect and
 * triggers draw(), plus an initial synchronous draw if the container is already sized. `skipFirstCallback`
 * exists for charts (eda-bar-d3) whose first draw() plays a one-time entrance animation - without it,
 * ResizeObserver.observe() fires its own callback once automatically right after the manual initial
 * draw() above, calling draw() a redundant second time and wiping out the animation.
 */
export function initD3ResizeObserver(
  container: HTMLElement,
  svg: any,
  draw: () => void,
  opts: { skipFirstCallback?: boolean } = {}
): ResizeObserver {
  let skipNext = opts.skipFirstCallback ?? false;
  const resizeObserver = new ResizeObserver(entries => {
    if (skipNext) { skipNext = false; return; }
    const { width: w, height: h } = entries[0].contentRect;
    if (w > 0 && h > 0) {
      svg.attr('width', w).attr('height', h);
      draw();
    }
  });
  resizeObserver.observe(container);

  const w = container.clientWidth;
  const h = container.clientHeight;
  if (w > 0 && h > 0) {
    svg.attr('width', w).attr('height', h);
    draw();
  }
  return resizeObserver;
}

/** Shared ngOnDestroy teardown: hide any open D3 tooltip and disconnect the resize observer. */
export function teardownD3Chart(
  tooltipService: { hide: () => void } | undefined,
  resizeObserver: ResizeObserver | undefined
): void {
  tooltipService?.hide();
  resizeObserver?.disconnect();
}
