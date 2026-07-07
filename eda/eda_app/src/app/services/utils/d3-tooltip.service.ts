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

  show(event: MouseEvent, html: string, cssClass: string): void {
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
      .style('left', (event.pageX - 81) + 'px')
      .style('top', (event.pageY - 25) + 'px');
  }

  move(event: MouseEvent): void {
    if (this.div) {
      this.div.style('left', (event.pageX) + 'px')
        .style('top', (event.pageY - 50) + 'px');
    }
  }

  hide(): void {
    if (this.div) {
      this.div.remove();
      this.div = null;
    }
  }
}
