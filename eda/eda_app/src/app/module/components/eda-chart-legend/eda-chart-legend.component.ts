import {
  AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostBinding, HostListener, Input,
  OnChanges, OnDestroy, OnInit, Output, QueryList, ViewChildren
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface EdaLegendItem {
  label: string;
  color: string;
  hidden: boolean;
}

@Component({
  standalone: true,
  selector: 'eda-chart-legend',
  templateUrl: './eda-chart-legend.component.html',
  styleUrls: ['./eda-chart-legend.component.css'],
  imports: [CommonModule]
})
export class EdaChartLegendComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() items: EdaLegendItem[] = [];
  /** Max height the legend can take, as a percentage of the chart's total height (SVG + legend). */
  @Input() maxHeightPercent = 25;
  @Output() toggle: EventEmitter<number> = new EventEmitter<number>();

  // Bound on the host itself (not an inner div) because its containing block is the chart
  // wrapper (which has a definite height) - a percentage max-height on a nested div would
  // resolve against this component's own auto-height host and compute to nothing.
  // A plain CSS percentage (rather than a JS/ResizeObserver-computed pixel value) is what makes
  // this self-updating on every panel resize for free, with no re-measurement timing to get
  // wrong: the browser recomputes it on every reflow, same as any other percentage height. It's
  // also what the item-hiding logic below measures against, so that stays reliable too.
  @HostBinding('style.display') hostDisplay = 'block';
  @HostBinding('style.flex') hostFlex = '0 0 auto';
  @HostBinding('style.overflow') hostOverflow = 'hidden';
  @HostBinding('style.max-height.%') get hostMaxHeight(): number { return this.maxHeightPercent; }

  @ViewChildren('legendItemEl') legendItemEls?: QueryList<ElementRef<HTMLDivElement>>;

  fontSize = '14px';
  boxSize = '10px';

  /** Items beyond this index belong to a row that doesn't fully fit in the CSS-clipped host
   *  height, so they're hidden (not removed - see recomputeVisibleCount) instead of being cut
   *  off mid-row. null = not measured yet / everything fits. */
  visibleCount: number | null = null;

  private resizeObserver?: ResizeObserver;
  private itemsQueryChangesSub?: { unsubscribe(): void };

  constructor(private elRef: ElementRef<HTMLElement>, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.updateSizing();
  }

  ngOnChanges(): void {
    this.updateSizing();
  }

  ngAfterViewInit(): void {
    // All items are always rendered (just hidden past visibleCount, see template) - re-measure
    // whenever the rendered set changes shape (new data), not just when its length changes.
    this.itemsQueryChangesSub = this.legendItemEls?.changes.subscribe(() => this.recomputeVisibleCount());
    this.recomputeVisibleCount();

    if ('ResizeObserver' in window) {
      // Observing the host itself (not the wrapper) is what makes this reliable: its clientHeight
      // is already the real, CSS-clipped available space (driven by the max-height binding
      // above), so there's no separate "budget" calculation that could fall out of sync with an
      // ancestor's live size.
      this.resizeObserver = new ResizeObserver(() => this.recomputeVisibleCount());
      this.resizeObserver.observe(this.elRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.itemsQueryChangesSub?.unsubscribe();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateSizing();
    this.recomputeVisibleCount();
  }

  private updateSizing(): void {
    let variador = 0;
    if (window.innerWidth < 1500) variador = -2;
    if (window.innerWidth < 1100) variador = -4;
    const manySeries = this.items.length > 10;
    // Chart.js hardcodes the legend label font to 14px regardless of manySeries/variador - only boxWidth/padding scale.
    this.fontSize = '14px';
    this.boxSize = `${(manySeries ? 8 : 10) + variador}px`;
  }

  /** Finds how many items (from the start) belong to rows that fit ENTIRELY within the host's
   *  current (CSS-clipped) height, so a row never appears half-cut at the boundary. Items beyond
   *  that stay in the DOM (just visually hidden) so they're still measurable - which is what lets
   *  the count grow back when the panel is enlarged again, not just shrink. */
  private recomputeVisibleCount(): void {
    const hostEl = this.elRef.nativeElement;
    const itemEls = this.legendItemEls;
    if (!itemEls || itemEls.length === 0) return;

    const budget = hostEl.clientHeight;
    const hostTop = hostEl.getBoundingClientRect().top;

    let fitCount = 0;
    let currentRowTop: number | null = null;
    let currentRowFits = true;
    let index = 0;

    itemEls.forEach((el) => {
      const rect = el.nativeElement.getBoundingClientRect();
      const relTop = Math.round(rect.top - hostTop);
      const relBottom = rect.bottom - hostTop;
      // A couple of pixels of tolerance for sub-pixel layout jitter between items on the same row.
      if (currentRowTop === null || relTop > currentRowTop + 2) {
        currentRowTop = relTop;
        currentRowFits = relBottom <= budget;
      }
      if (currentRowFits) fitCount = index + 1;
      index++;
    });

    // Never fully hide the legend: always show at least the first row, even if it alone
    // overflows the budget (e.g. one very long label).
    const newCount = fitCount > 0 ? fitCount : Math.min(1, this.items.length);
    const resolved = newCount >= this.items.length ? null : newCount;

    if (resolved !== this.visibleCount) {
      this.visibleCount = resolved;
      this.cdr.detectChanges();
    }
  }

  onToggle(index: number): void {
    this.toggle.emit(index);
  }
}
