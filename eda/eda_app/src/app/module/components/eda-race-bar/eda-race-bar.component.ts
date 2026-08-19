import { Component, AfterViewInit, OnInit, Input, ViewChild, ElementRef, Output, EventEmitter, OnDestroy } from '@angular/core';
import * as d3 from 'd3';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RaceBar } from './eda-race-bar';
import { StyleProviderService, lightenHex, sanitizeId, ensureLinearGradient, formatAxisValue, formatDeNumber, initD3ResizeObserver, teardownD3Chart, measureMaxLabelWidth } from '@eda/services/service.index';
import { EdaChartLegendComponent } from '../eda-chart-legend/eda-chart-legend.component';

// Own translations, not getLocaleMonthNames(LOCALE_ID) - the app never provides a LOCALE_ID, so that always falls back to 'en-US'.
const MONTH_LABELS: string[] = [
  $localize`:@@raceBarMonthJan:Ene`, $localize`:@@raceBarMonthFeb:Feb`, $localize`:@@raceBarMonthMar:Mar`,
  $localize`:@@raceBarMonthApr:Abr`, $localize`:@@raceBarMonthMay:May`, $localize`:@@raceBarMonthJun:Jun`,
  $localize`:@@raceBarMonthJul:Jul`, $localize`:@@raceBarMonthAug:Ago`, $localize`:@@raceBarMonthSep:Sep`,
  $localize`:@@raceBarMonthOct:Oct`, $localize`:@@raceBarMonthNov:Nov`, $localize`:@@raceBarMonthDec:Dic`,
];
const QUARTER_PREFIX = $localize`:@@raceBarQuarterPrefix:T`;
const WEEK_PREFIX = $localize`:@@raceBarWeekPrefix:Sem`;
const PLAY_ARIA_LABEL = $localize`:@@raceBarPlayAria:Reproducir`;
const PAUSE_ARIA_LABEL = $localize`:@@raceBarPauseAria:Pausa`;
const TIMELINE_ARIA_LABEL = $localize`:@@raceBarTimelineAria:Línea de tiempo`;

/** One tick = one real queried data point at the date column's own granularity - no interpolated sub-steps. */
interface RaceFrame {
  key: string;
  label: string;
  values: Map<string, number>;
}

interface RaceBarDatum {
  category: string;
  value: number;
  rank: number;
}

const GRADIENT_LIGHTEN_AMOUNT = 60;
// Budget for computeTopN, not a hard pixel size - rowHeight is always innerHeight / topN.
const MIN_ROW_HEIGHT_PX = 28;
const MIN_BARS = 4;
const MAX_BARS = 15;
// Backstop against a stray/corrupt saved topNCount - the dialog itself caps its input at 20.
const MAX_TOPN_COUNT = 30;
// How fast a bar's ROW settles, independent of transitionMs (which paces its WIDTH/value).
const RANK_TRANSITION_MS = 500;
// Fallback when inject.transitionMs isn't set - the date column's own format, not this, decides tick count/labels.
// Exported so category-chart-dialog.component.ts's transitionMs default/fallback can't drift out of sync with it.
export const DEFAULT_FRAME_DURATION_MS = 3000;

@Component({
  standalone: true,
  selector: 'eda-race-bar',
  templateUrl: './eda-race-bar.component.html',
  styleUrls: ['./eda-race-bar.component.css'],
  imports: [FormsModule, CommonModule, EdaChartLegendComponent]
})
export class EdaRaceBarComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() inject: RaceBar;
  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef;
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();

  id: string;
  svg: any;
  resizeObserver!: ResizeObserver;

  chartLegend: boolean;
  legendItems: { label: string; color: string; hidden: boolean }[] = [];
  playing = false;
  finished = false;
  periodLabel = '';
  tickerFontSizePx = 20;
  /** True when the query didn't yield a single valid (date, category, value) row. */
  noData = false;
  /** Authoritative, always-integer current tick - public because the template reads it directly. */
  currentFrameIndex = 0;
  /** Timeline scrubber's bound value - glides smoothly during playback (animateScrub), snaps instantly on manual drag (onScrub). */
  scrubPosition = 0;

  private frames: RaceFrame[] = [];
  /** Date column's declared granularity - drives parseKeyToDate/formatDateForDisplay. */
  private dateFormat = 'day';
  private colorByCategory: Map<string, string> = new Map();
  /** Ordered, de-duplicated category values - public so getChartCategoryValues() can seed the color dialog. */
  allCategories: string[] = [];
  /** Mirrors inject.assignedColors by reference - mutated in place by eda-blank-panel's recolorLegacyAssignedColors(). */
  assignedColors: any[] = [];
  private hiddenCategories: Set<string> = new Set();
  /** Row eases toward its live-computed rank instead of snapping - carries the in-progress glide across tween frames/ticks. */
  private displayedRankByCategory: Map<string, number> = new Map();
  private timer: any = null;
  private scrubAnimFrame: number | null = null;
  private fontFamily = 'inherit';
  private fontColor = '#000000';
  private hasRendered = false;

  // Persistent skeleton (built by draw()) - renderFrame() only ever joins data onto these.
  private defs: any;
  private rootG: any;
  private axisG: any;
  private barsG: any;
  private catLabelsG: any;
  private valueLabelsG: any;

  constructor(private styleProviderService: StyleProviderService) { }

  ngOnInit(): void {
    this.id = `raceBar_${this.inject.id}`;
    this.chartLegend = this.inject.chartLegend ?? true;
    this.styleProviderService.panelFontFamily.subscribe(v => this.fontFamily = v).unsubscribe();
    this.styleProviderService.panelFontColor.subscribe(v => this.fontColor = v).unsubscribe();
    this.assignedColors = this.inject.assignedColors;
    this.colorByCategory = new Map((this.assignedColors || []).map((c: any) => [String(c.value), c.color]));
    this.buildFrames();
    this.noData = this.frames.length === 0;
    this.legendItems = this.allCategories.map(cat => ({
      label: cat,
      color: this.colorByCategory.get(cat) || '#cccccc',
      hidden: this.hiddenCategories.has(cat)
    }));
  }

  ngAfterViewInit(): void {
    const container = this.svgContainer.nativeElement as HTMLElement;
    if (!this.svg) this.svg = d3.select(container).append('svg');
    this.resizeObserver = initD3ResizeObserver(container, this.svg, () => this.draw(), { skipFirstCallback: true });
  }

  ngOnDestroy(): void {
    this.pause();
    teardownD3Chart(undefined, this.resizeObserver);
  }

  /** Called by the shared category-chart-dialog.component.ts on every live color/toggle edit. */
  updateChart(): void {
    this.chartLegend = this.inject.chartLegend ?? true;
    this.assignedColors = this.inject.assignedColors;
    this.colorByCategory = new Map((this.assignedColors || []).map((c: any) => [String(c.value), c.color]));
    this.legendItems = this.allCategories.map((cat, i) => ({
      label: cat,
      color: this.colorByCategory.get(cat) || '#cccccc',
      hidden: this.legendItems[i]?.hidden ?? false
    }));
    this.draw();
  }

  toggleLegend(index: number): void {
    const category = this.allCategories[index];
    if (this.hiddenCategories.has(category)) this.hiddenCategories.delete(category);
    else this.hiddenCategories.add(category);
    this.legendItems[index].hidden = this.hiddenCategories.has(category);
    this.renderFrame(this.currentFrameIndex, false);
  }

  get frameCount(): number {
    return this.frames.length;
  }

  private get frameDurationMs(): number {
    return this.inject.transitionMs && this.inject.transitionMs > 0 ? this.inject.transitionMs : DEFAULT_FRAME_DURATION_MS;
  }

  get playPauseAriaLabel(): string {
    return this.playing ? PAUSE_ARIA_LABEL : PLAY_ARIA_LABEL;
  }

  get timelineAriaLabel(): string {
    return TIMELINE_ARIA_LABEL;
  }

  get firstPeriodLabel(): string {
    return this.frames[0]?.label ?? '';
  }

  get lastPeriodLabel(): string {
    return this.frames[this.frames.length - 1]?.label ?? '';
  }

  /** Fires while dragging - always pauses and jumps instantly (animate=false). */
  onScrub(event: Event): void {
    const index = Number((event.target as HTMLInputElement).value);
    this.pause();
    this.finished = index >= this.frames.length - 1;
    this.renderFrame(index, false);
  }

  /** Glides scrubPosition from `from` to `to` over `duration` ms so it reads as continuous motion. */
  private animateScrub(from: number, to: number, duration: number): void {
    this.cancelScrubAnimation();
    if (duration <= 0) { this.scrubPosition = to; return; }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      this.scrubPosition = from + (to - from) * t;
      this.scrubAnimFrame = t < 1 ? requestAnimationFrame(step) : null;
    };
    this.scrubAnimFrame = requestAnimationFrame(step);
  }

  private cancelScrubAnimation(): void {
    if (this.scrubAnimFrame != null) {
      cancelAnimationFrame(this.scrubAnimFrame);
      this.scrubAnimFrame = null;
    }
  }

  /** Sorts date keys chronologically via parseKeyToDate, falling back to numeric/Date.parse/lexicographic. */
  private compareDateKeys(a: string, b: string): number {
    const da = this.parseKeyToDate(a), db = this.parseKeyToDate(b);
    if (da && db) return da.getTime() - db.getTime();
    const na = Number(a), nb = Number(b);
    if (a !== '' && b !== '' && !isNaN(na) && !isNaN(nb)) return na - nb;
    const pa = Date.parse(a), pb = Date.parse(b);
    if (!isNaN(pa) && !isNaN(pb)) return pa - pb;
    return a < b ? -1 : a > b ? 1 : 0;
  }

  /** Parses a raw date-column value per its declared format (this.dateFormat), already truncated to that
   * granularity by the backend (to_char/DATE_FORMAT/...); returns null if it doesn't match the expected shape. */
  private parseKeyToDate(key: string): Date | null {
    switch (this.dateFormat) {
      case 'year': {
        const y = Number(key);
        return key !== '' && !isNaN(y) ? new Date(Date.UTC(y, 0, 1)) : null;
      }
      case 'quarter': {
        const m = /^(\d{4})-Q(\d)$/.exec(key);
        return m ? new Date(Date.UTC(Number(m[1]), (Number(m[2]) - 1) * 3, 1)) : null;
      }
      case 'month': {
        const m = /^(\d{4})-(\d{2})$/.exec(key);
        return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)) : null;
      }
      case 'week': {
        // ISO year-week (to_char 'IYYY-IW'), approximated as that week's Monday.
        const m = /^(\d{4})-(\d{2})$/.exec(key);
        if (!m) return null;
        const isoYear = Number(m[1]), isoWeek = Number(m[2]);
        const simple = new Date(Date.UTC(isoYear, 0, 1 + (isoWeek - 1) * 7));
        const dayOfWeek = simple.getUTCDay() || 7; // Mon=1..Sun=7
        simple.setUTCDate(simple.getUTCDate() - dayOfWeek + 1);
        return simple;
      }
      case 'day':
      case 'No':
      case undefined:
      default: {
        const t = Date.parse(key.replace(' ', 'T'));
        return isNaN(t) ? null : new Date(t);
      }
    }
  }

  private monthLabel(monthIndex0: number): string {
    return MONTH_LABELS[((monthIndex0 % 12) + 12) % 12];
  }

  /** ISO week number of `date`. */
  private isoWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /** Renders `date` at the column's own granularity (this.dateFormat). */
  private formatDateForDisplay(date: Date): string {
    switch (this.dateFormat) {
      case 'year': return String(date.getUTCFullYear());
      case 'quarter': return `${QUARTER_PREFIX}${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;
      case 'month': return `${this.monthLabel(date.getUTCMonth())} ${date.getUTCFullYear()}`;
      case 'week': return `${WEEK_PREFIX} ${this.isoWeekNumber(date)} · ${date.getUTCFullYear()}`;
      case 'day':
      case 'No':
      case undefined:
      default: return `${date.getUTCDate()} ${this.monthLabel(date.getUTCMonth())} ${date.getUTCFullYear()}`;
    }
  }

  /** Formats a raw date value for display; falls back to the raw value if it doesn't parse. */
  private formatPeriodLabel(key: string): string {
    const date = this.parseKeyToDate(key);
    return date ? this.formatDateForDisplay(date) : key;
  }

  private buildFrames(): void {
    const query = this.inject.dataDescription.query;
    const dateCol = (query || []).find((c: any) => c.column_type === 'date');
    const dateIndex = dateCol ? query.indexOf(dateCol) : -1;
    this.dateFormat = dateCol?.format || 'day';
    const numericIndex = this.inject.dataDescription.numericColumns[0]?.index;
    const categoryCol = this.inject.dataDescription.otherColumns.find((c: any) => c.index !== dateIndex);
    const categoryIndex = categoryCol ? categoryCol.index : this.inject.dataDescription.otherColumns[0]?.index;

    const byDate = new Map<string, Map<string, number>>();
    const categories: string[] = [];
    const seenCategories = new Set<string>();

    (this.inject.data.values || []).forEach((row: any[]) => {
      if (dateIndex < 0 || row[dateIndex] == null || row[dateIndex] === '') return;
      if (categoryIndex == null || row[categoryIndex] == null || row[categoryIndex] === '') return;
      const dateKey = String(row[dateIndex]).trim();
      const category = String(row[categoryIndex]);
      const value = Number(row[numericIndex]) || 0;
      if (!seenCategories.has(category)) { seenCategories.add(category); categories.push(category); }
      if (!byDate.has(dateKey)) byDate.set(dateKey, new Map());
      const catMap = byDate.get(dateKey);
      catMap.set(category, (catMap.get(category) || 0) + value);
    });

    this.allCategories = categories;
    const sortedKeys = [...byDate.keys()].sort((a, b) => this.compareDateKeys(a, b));
    this.frames = sortedKeys.map(key => ({ key, label: this.formatPeriodLabel(key), values: byDate.get(key) }));
  }

  /** inject.topNCount wins when set; otherwise falls back to however many rows the panel's height fits. */
  private computeTopN(innerHeight: number): number {
    if (this.inject.topNCount && this.inject.topNCount > 0) {
      return Math.max(1, Math.min(this.inject.topNCount, MAX_TOPN_COUNT, this.allCategories.length || 1));
    }
    const n = Math.floor(innerHeight / MIN_ROW_HEIGHT_PX);
    return Math.max(MIN_BARS, Math.min(MAX_BARS, n || MIN_BARS));
  }

  /** Recomputed fresh per frame so a category can enter/leave the visible top N as its value moves. */
  private rankedEntries(frame: RaceFrame, topN: number): RaceBarDatum[] {
    const all = this.allCategories
      .filter(category => !this.hiddenCategories.has(category))
      .map(category => ({ category, value: frame.values.get(category) ?? 0 }));
    all.sort((a, b) => b.value - a.value);
    return all.slice(0, topN).map((d, i) => ({ category: d.category, value: d.value, rank: i }));
  }

  private gradientId(hex: string): string {
    return `race-grad-${this.id}-${sanitizeId(hex)}`;
  }

  private barFill(category: string): string {
    const hex = this.colorByCategory.get(category) || '#4472c4';
    if (!(this.inject.useGradient ?? true)) return hex;
    return ensureLinearGradient(this.defs, this.gradientId(hex), [
      { offset: '0%', color: hex },
      { offset: '100%', color: lightenHex(hex, GRADIENT_LIGHTEN_AMOUNT) }
    ], { x1: '0%', y1: '0%', x2: '100%', y2: '0%' });
  }

  private emitClick(d: RaceBarDatum): void {
    if (this.inject.linkedDashboard) {
      const props = this.inject.linkedDashboard;
      const url = window.location.href.slice(0, window.location.href.indexOf('/dashboard')) +
        `/dashboard/${props.dashboardID}?${props.table}.${props.col}=${d.category}`;
      window.open(url, '_blank');
    } else {
      this.onClick.emit({ label: d.category, filterBy: d.category, value: d.value });
    }
  }

  /** (Re)builds the static skeleton - called on mount and on every resize. Never called mid-race by the play timer, which only ever calls renderFrame() on the skeleton already in place. */
  draw(): void {
    const container = this.svgContainer.nativeElement as HTMLElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0 || !this.frames.length) return;

    this.svg.selectAll('*').remove();
    this.defs = this.svg.append('defs');
    this.rootG = this.svg.append('g');
    this.axisG = this.rootG.append('g').attr('class', 'eda-race-bar-axis');
    this.barsG = this.rootG.append('g').attr('class', 'eda-race-bar-bars');
    this.valueLabelsG = this.rootG.append('g').attr('class', 'eda-race-bar-value-labels');
    this.catLabelsG = this.rootG.append('g').attr('class', 'eda-race-bar-cat-labels');

    this.renderFrame(this.currentFrameIndex, false);

    if (!this.hasRendered) {
      this.hasRendered = true;
      if (this.inject.chartAnimation ?? true) this.play();
    }
  }

  /** Joins `entries` onto the persistent skeleton groups and transitions to them - `animate=false` (initial draw / resize / legend toggle) jumps straight to the final state instead of tweening. */
  private renderFrame(index: number, animate: boolean): void {
    const container = this.svgContainer?.nativeElement as HTMLElement;
    if (!container || !this.rootG) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0 || !this.frames.length) return;

    const frame = this.frames[index];
    this.periodLabel = frame.label;
    this.tickerFontSizePx = Math.max(14, Math.min(32, height * 0.12));

    // right depends on THIS frame's widest value label, so a big number doesn't get clipped.
    const marginTop = 10, marginBottom = 4, marginLeft = 8;
    const innerHeightProbe = Math.max(height - marginTop - marginBottom, 10);
    const topN = this.computeTopN(innerHeightProbe);
    const entries = this.rankedEntries(frame, topN);
    const duration = animate ? this.frameDurationMs : 0;
    const oldFrame = this.frames[this.currentFrameIndex];
    const oldValuesByCategory = oldFrame ? oldFrame.values : new Map<string, number>();

    const valueLabelTexts = entries.map((d: RaceBarDatum) => formatDeNumber(Math.round(d.value)));
    const maxValueLabelWidth = measureMaxLabelWidth(valueLabelTexts, 12, this.fontFamily);
    const margin = { top: marginTop, right: Math.max(24, maxValueLabelWidth + 16), bottom: marginBottom, left: marginLeft };
    const innerWidth = Math.max(width - margin.left - margin.right, 10);
    const innerHeight = innerHeightProbe;

    this.rootG.attr('transform', `translate(${margin.left},${margin.top})`);

    // Covers both the target value and the value a bar's animating down from, so a shrinking bar never renders wider than the plot area.
    const maxValue = Math.max(1, ...entries.map((d: RaceBarDatum) => Math.max(d.value, oldValuesByCategory.get(d.category) ?? 0)));
    const xScale = d3.scaleLinear().domain([0, maxValue]).nice().range([0, innerWidth]);
    const rowHeight = innerHeight / topN;
    const barHeight = Math.max(rowHeight * 0.7, 6);
    const yForRank = (rank: number) => rank * rowHeight + (rowHeight - barHeight) / 2;
    const yMidForRank = (rank: number) => rank * rowHeight + rowHeight / 2;
    const offscreenY = topN * rowHeight;

    const axis = d3.axisTop(xScale)
      .ticks(Math.max(2, Math.floor(innerWidth / 120)))
      .tickSize(-innerHeight)
      .tickFormat((v: any) => formatAxisValue(v));
    this.axisG.transition().duration(duration).ease(d3.easeLinear).call(axis);
    this.axisG.select('.domain').remove();
    this.axisG.selectAll('line').style('stroke', this.fontColor).style('opacity', 0.12);
    this.axisG.selectAll('text').style('font-family', this.fontFamily).style('font-size', '10px').style('fill', this.fontColor).style('opacity', 0.7);

    // Target row is re-derived every tick from live interpolated values (crosses exactly on overtake);
    // the on-screen row eases toward it instead of snapping - see displayedRankByCategory below.
    const rankMs = Math.min(RANK_TRANSITION_MS, duration);

    const bars = this.barsG.selectAll('rect.eda-race-bar-bar')
      .data(entries, (d: RaceBarDatum) => d.category);
    const survivingCategories = new Set(bars.data().map((d: RaceBarDatum) => d.category));

    bars.exit()
      .each((d: RaceBarDatum) => this.displayedRankByCategory.delete(d.category))
      .transition().duration(rankMs).ease(d3.easeLinear)
      .attr('y', offscreenY + (rowHeight - barHeight) / 2)
      .style('opacity', 0)
      .remove();

    const barsEnter = bars.enter().append('rect')
      .attr('class', 'eda-race-bar-bar')
      .attr('rx', 3).attr('ry', 3)
      .attr('x', 0)
      .attr('y', offscreenY + (rowHeight - barHeight) / 2)
      .attr('height', barHeight)
      .attr('width', 0)
      .style('opacity', 1)
      .style('cursor', 'pointer')
      .on('click', (event: any, d: RaceBarDatum) => this.emitClick(d));

    const barsMerged = barsEnter.merge(bars)
      .attr('fill', (d: RaceBarDatum) => this.barFill(d.category))
      .attr('height', barHeight);
    // Cancels a still-running exit transition on a category that re-entered topN before it finished.
    barsMerged.interrupt();

    const catLabels = this.catLabelsG.selectAll('text.eda-race-bar-cat-label')
      .data(entries, (d: RaceBarDatum) => d.category);

    // Exit/enter both target offscreenY, not the row formula, which would read a stale/premature rank.
    const offscreenMid = offscreenY + rowHeight / 2;
    catLabels.exit().transition().duration(rankMs).ease(d3.easeLinear).attr('y', offscreenMid).style('opacity', 0).remove();

    const catEnter = catLabels.enter().append('text')
      .attr('class', 'eda-race-bar-cat-label')
      .attr('x', 8)
      .attr('y', offscreenMid)
      .style('opacity', 0)
      .style('font-family', this.fontFamily)
      .style('pointer-events', 'none')
      .text((d: RaceBarDatum) => d.category);

    const catMerged = catEnter.merge(catLabels).text((d: RaceBarDatum) => d.category);
    catMerged.interrupt();
    // A 0-width bar has no name to sit on, so opacity rides the short clock instead of the live value.
    catMerged.transition('fade').duration(rankMs).ease(d3.easeLinear)
      .style('opacity', (d: RaceBarDatum) => d.value === 0 ? 0 : 1);

    const valueLabels = this.valueLabelsG.selectAll('text.eda-race-bar-value-label')
      .data(entries, (d: RaceBarDatum) => d.category);

    valueLabels.exit().transition().duration(rankMs).ease(d3.easeLinear).attr('y', offscreenMid).style('opacity', 0).remove();

    const valEnter = valueLabels.enter().append('text')
      .attr('class', 'eda-race-bar-value-label')
      // Starts at value 0 like the bar itself, so a new entrant's number counts up together with its bar.
      .attr('x', 8)
      .attr('y', offscreenMid)
      .style('opacity', 0)
      .style('font-family', this.fontFamily)
      .style('fill', this.fontColor)
      .style('pointer-events', 'none')
      .text(formatDeNumber(0));

    const valMerged = valEnter.merge(valueLabels);
    valMerged.interrupt();
    valMerged.transition('fade').duration(rankMs).ease(d3.easeLinear).style('opacity', 1);

    // Shared clock per category: value interpolates old->new; row order is re-sorted from it every tick.
    const valueAt = new Map<string, (t: number) => number>();
    entries.forEach((d: RaceBarDatum) => {
      const startValue = survivingCategories.has(d.category) ? (oldValuesByCategory.get(d.category) ?? 0) : 0;
      valueAt.set(d.category, d3.interpolateNumber(startValue, d.value));
      // New categories start their glide one row below the last visible slot, like the bar itself.
      if (!this.displayedRankByCategory.has(d.category)) this.displayedRankByCategory.set(d.category, topN);
    });

    this.rootG.transition('race').duration(duration).ease(d3.easeLinear)
      .tween('race', () => {
        let lastElapsedMs = 0;
        return (t: number) => {
          const elapsedMs = t * duration;
          // Real elapsed ms, not just t's fraction, so catch-up speed stays consistent regardless of transitionMs.
          const dtMs = Math.max(0, elapsedMs - lastElapsedMs);
          lastElapsedMs = elapsedMs;
          const catchUp = duration <= 0 ? 1 : Math.min(1, dtMs / RANK_TRANSITION_MS);

          const live = entries.map((d: RaceBarDatum) => ({ category: d.category, value: valueAt.get(d.category)!(t) }));
          live.sort((a, b) => b.value - a.value);
          const targetRank = new Map<string, number>();
          const liveValue = new Map<string, number>();
          live.forEach((d, i) => { targetRank.set(d.category, i); liveValue.set(d.category, d.value); });

          const rowOf = new Map<string, number>();
          entries.forEach((d: RaceBarDatum) => {
            const target = targetRank.get(d.category) ?? d.rank;
            const prevRow = this.displayedRankByCategory.get(d.category) ?? target;
            const nextRow = t >= 1 ? target : prevRow + (target - prevRow) * catchUp;
            this.displayedRankByCategory.set(d.category, nextRow);
            rowOf.set(d.category, nextRow);
          });
          const valueOf = (d: RaceBarDatum) => liveValue.get(d.category) ?? d.value;

          barsMerged
            .attr('y', (d: RaceBarDatum) => yForRank(rowOf.get(d.category) ?? d.rank))
            .attr('width', (d: RaceBarDatum) => Math.max(xScale(valueOf(d)), 0));
          catMerged.attr('y', (d: RaceBarDatum) => yMidForRank(rowOf.get(d.category) ?? d.rank));
          valMerged
            .attr('y', (d: RaceBarDatum) => yMidForRank(rowOf.get(d.category) ?? d.rank))
            .attr('x', (d: RaceBarDatum) => Math.max(xScale(valueOf(d)), 0) + 8)
            .each(function (d: RaceBarDatum) { (this as any).textContent = formatDeNumber(Math.round(valueOf(d))); });
        };
      });

    if (animate) {
      this.animateScrub(this.currentFrameIndex, index, duration);
    } else {
      this.cancelScrubAnimation();
      this.scrubPosition = index;
    }
    this.currentFrameIndex = index;
  }

  play(): void {
    if (this.playing || this.frames.length <= 1) return;
    if (this.currentFrameIndex >= this.frames.length - 1) {
      this.currentFrameIndex = 0;
      this.renderFrame(0, false);
    }
    this.playing = true;
    this.finished = false;
    this.scheduleNext();
  }

  private scheduleNext(): void {
    this.timer = setTimeout(() => {
      const nextIndex = this.currentFrameIndex + 1;
      this.renderFrame(nextIndex, true);
      if (nextIndex >= this.frames.length - 1) {
        this.playing = false;
        this.finished = true;
        this.timer = null;
        return;
      }
      this.scheduleNext();
    }, this.frameDurationMs);
  }

  pause(): void {
    this.playing = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    // Snap the scrubber forward too - currentFrameIndex is already committed even if the transition isn't done.
    this.cancelScrubAnimation();
    this.scrubPosition = this.currentFrameIndex;
  }

  togglePlay(): void {
    if (this.playing) this.pause();
    else this.play();
  }
}
