import { Injectable } from '@angular/core';
import * as d3 from 'd3';

/**
 * Shared floating tooltip for the D3 chart components (doughnut, polarArea, bar, ...).
 * Each chart still builds its own HTML content (the data shape/formatting differs too much
 * per chart type to unify), but the div lifecycle - creation, fade-in, positioning, and
 * cleanup - was duplicated (and had drifted, inconsistently, between components) so it lives
 * here once instead.
 */
@Injectable()
export class D3TooltipService {
  private div: any = null;

  show(event: MouseEvent, html: string, cssClass: string, offsetX: number = -81, offsetY: number = -25, anchorBottomLeft: boolean = false): void {
    // A stray mouseover before the previous element's mouseout fired (easy to trigger on
    // tightly-packed marks) would otherwise leak an orphaned tooltip div every time, piling
    // several up on screen at once - remove any existing one first.
    this.hide();
    this.div = d3.select('body').append('div')
      .attr('class', cssClass)
      .style('opacity', 0)
      .style('z-index', 9999);
    this.div.transition().duration(200).style('opacity', 0.9);
    this.div.html(html)
      .style('left', (event.pageX + offsetX) + 'px')
      .style('top', this.topFor(event, offsetY, anchorBottomLeft) + 'px');
  }

  move(event: MouseEvent, offsetX: number = 0, offsetY: number = -50, anchorBottomLeft: boolean = false): void {
    if (this.div) {
      this.div.style('left', (event.pageX + offsetX) + 'px')
        .style('top', this.topFor(event, offsetY, anchorBottomLeft) + 'px');
    }
  }

  // offsetX/offsetY normally place the div's own top-left corner. anchorBottomLeft instead
  // anchors its BOTTOM-left corner at (pageX+offsetX, pageY+offsetY) - i.e. the div grows
  // upward from that point rather than downward - by measuring its just-rendered height and
  // subtracting it back out of the top.
  private topFor(event: MouseEvent, offsetY: number, anchorBottomLeft: boolean): number {
    const top = event.pageY + offsetY;
    if (!anchorBottomLeft) return top;
    const height = (this.div.node() as HTMLElement).offsetHeight;
    return top - height;
  }

  hide(): void {
    if (this.div) {
      this.div.remove();
      this.div = null;
    }
  }
}
