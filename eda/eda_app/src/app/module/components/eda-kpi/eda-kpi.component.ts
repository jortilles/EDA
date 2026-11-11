import { Component, OnInit, OnDestroy, Input, EventEmitter, Output, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, HostBinding } from '@angular/core';
import { StyleProviderService } from '@eda/services/service.index';
import { formatNumber, registerLocaleData } from '@angular/common';
import { EdaKpi } from './eda-kpi';
import es from '@angular/common/locales/es';
import { EdaBarD3Component } from '../eda-bar-d3/eda-bar.component';
import { EdaLineComponent } from '../eda-line-d3/eda-line.component';
import { EdaAreaComponent } from '../eda-area-d3/eda-area.component';
import { KPI_CONFIG } from '@eda/configs/customizable/customizable_default';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PipesModule } from '@eda/pipes/pipes.module';

@Component({
    standalone: true,
    selector: 'eda-kpi',
    templateUrl: './eda-kpi.component.html',
    imports: [FormsModule, CommonModule, EdaBarD3Component, EdaLineComponent, EdaAreaComponent, PipesModule]
})

export class EdaKpiComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input() inject: EdaKpi;
    @Output() onNotify: EventEmitter<any> = new EventEmitter();
    // Re-emits the click of the embedded bar/line/area chart
    @Output() onClick: EventEmitter<any> = new EventEmitter();

    @HostBinding('style.display') readonly hostDisplay = 'block';
    @HostBinding('style.position') readonly hostPosition = 'relative';
    @HostBinding('style.width') readonly hostWidth = '100%';
    @HostBinding('style.height') readonly hostHeight = '100%';
    @HostBinding('style.background-color') get hostBg() { return this.inject?.backgroundColor || ''; }
    @ViewChild('kpiContainer') kpiContainer: ElementRef;
    @ViewChild('sufixContainer') sufixContainer: ElementRef;
    // Whichever of eda-bar-d3/eda-line-d3/eda-area-d3 is actually mounted (see eda-kpi.component.html's
    // @switch on inject.edaChart.edaChart) - only one is ever in the DOM at a time, all three share
    // the same updateChart() convention, so a loose type is fine here.
    @ViewChild('EdaChart', { static: false }) edaChartComponent: any;
    sufixClick: boolean = false;
    color: string = this.styleProviderService.panelFontColor.source['_value'];
    family: string = this.styleProviderService.panelFontFamily.source['_value'];
    defaultColor = '#67757c';
    warningColor = '#ff8100';
    containerHeight: number = 20;
    containerWidth: number = 20;

    /** true → Edalitics mode (numeric input in the KPI dialog) | false → forks mode (hover +/- buttons over the KPI) */
    public readonly useHoverResize: boolean = !KPI_CONFIG.USE_EDALITICS_SIZE_LOGIC;
    /** Smallest size we are willing to render (below it the text is clipped with an ellipsis). */
    private readonly minFontSize = 10;
    /** Scale limits and default, configurable per product via feature flags. */
    private readonly minFontScale = KPI_CONFIG.MIN_FONT_SCALE;
    private readonly maxFontScale = KPI_CONFIG.MAX_FONT_SCALE;
    private readonly defaultFontScale = KPI_CONFIG.DEFAULT_FONT_SCALE;
    private readonly fontScaleStep = 0.1;
    /** Width-share bounds for the prefix image (rest of the width goes to value/suffix). */
    private readonly minImageScale = KPI_CONFIG.IMAGE_MIN_SCALE;
    private readonly maxImageScale = KPI_CONFIG.IMAGE_MAX_SCALE;
    private readonly defaultImageScale = KPI_CONFIG.IMAGE_DEFAULT_SCALE;
    /** Fixed headroom so the up-front (pre-render) size estimate never overflows once actually rendered. */
    private readonly edaSafetyMargin = 0.9;
    /** Panel width/height ratio above which the value+suffix stay on one line (plain kpi vs kpi+chart, which needs a lower threshold since the chart eats most of the panel's height). */
    private readonly edaStackRatio = KPI_CONFIG.STACK_RATIO;
    private readonly edaChartStackRatio = KPI_CONFIG.CHART_STACK_RATIO;
    /** Safety margin so sub-pixel rounding never makes the text overflow. */
    private readonly fitSafety = 0.98;
    public isHovered = false;

    /** Reusable canvas context used to measure the rendered text (no layout thrashing). */
    private measureCanvas?: HTMLCanvasElement;
    /** Percentage and +/- availability, cached per (fit, scale). */
    private controlsCache = { fit: -1, scale: -1, percent: KPI_CONFIG.DEFAULT_FONT_SCALE * 100, canUp: false, canDown: false };
    private resizeObserver?: ResizeObserver;

    constructor(private styleProviderService : StyleProviderService, private cdr: ChangeDetectorRef) { }

    ngAfterViewInit() {
        this.initDimensions();
        this.observeContainerResize();
        // The web font may load after the first paint: the measured width changes,
        // so the fit has to be recalculated once the font is actually ready.
        (document as any).fonts?.ready
            ?.then(() => this.cdr.detectChanges())
            .catch(() => undefined);
        this.cdr.detectChanges();
    }

    ngOnDestroy() {
        this.resizeObserver?.disconnect();
    }

    /** Recalculates the size whenever the value box changes (panel resize, zoom, chart on/off...). */
    private observeContainerResize(): void {
        const el: HTMLElement | undefined = this.kpiContainer?.nativeElement;
        if (!el || typeof ResizeObserver === 'undefined') return;
        this.resizeObserver = new ResizeObserver(() => {
            this.initDimensions();
            this.cdr.detectChanges();
        });
        this.resizeObserver.observe(el);
    }

    ngOnInit() {
        try {
            registerLocaleData(es);

            if (this.inject.kpiColor) {
                this.defaultColor = this.inject.kpiColor;
                this.color = this.inject.kpiColor;
            }

            if (typeof this.inject.valueFontScale !== 'number') {
                this.inject.valueFontScale = this.defaultFontScale;
            }

            if (this.inject.alertLimits?.length > 0) {
                this.inject.alertLimits.forEach(alert => {
                    const operand = alert.operand, warningColor = alert.color;
                    const value1 = this.inject.value, value2 = alert.value;
                    if (this.color !== this.defaultColor) this.defaultColor = this.color;
                    switch (operand) {
                        case '<': this.color = value1 < value2 ? warningColor : this.defaultColor; break;
                        case '=': this.color = value1 === value2 ? warningColor : this.defaultColor; break;
                        case '>': this.color = value1 > value2 ? warningColor : this.defaultColor; break;
                        default: this.color = this.defaultColor;
                    }
                });
            }

        } catch (e) {
            console.log('No alert limits defined (alertLimits)');
            console.log(e);
        }
    }


    public initDimensions() {
        if (this.kpiContainer) {
            // #kpiContainer is itself `absolute inset-0` (or, with an embedded chart, `height: 30%`
            // of that), so its own rendered box already *is* the exact space available to the
            // value/suffix/image - no need to climb to an ancestor to find it.
            const realContainer = this.kpiContainer.nativeElement;

            const widthKpiContainer = realContainer.offsetWidth;
            const heightKpiContainer = realContainer.offsetHeight;
            const sufixContainerReference = this.sufixContainer.nativeElement;

            if (widthKpiContainer > 0) {
                this.containerHeight = heightKpiContainer;
                this.containerWidth = widthKpiContainer;
            }

            // Auto margin
            sufixContainerReference.style.margin = "auto";
        }
    }

    setSufix(): void {
        this.sufixClick = !this.sufixClick;
        this.onNotify.emit({ sufix: this.inject.sufix });
    }

    onMouseEnter(): void {
        this.isHovered = true;
    }

    onMouseLeave(): void {
        this.isHovered = false;
    }

    shouldShowControls(): boolean {
        return this.useHoverResize && !!this.inject?.showResizeControls && this.isHovered;
    }

    /** Format string for the value's `number` pipe - fixes it at exactly `inject.decimals`
     *  fraction digits (matching the column's configured "Número de decimals") when known,
     *  otherwise keeps the original 0-10 range. */
    getNumberFormat(): string {
        const d = this.inject.decimals;
        return d != null ? `1.${d}-${d}` : '1.0-10';
    }

    /** Formats a raw KPI value the same way the template's `number` pipe would, for width measurement. */
    private formatValue(raw: any): string {
        if (raw === null || raw === undefined || raw === '') return '';
        const numeric = Array.isArray(raw) ? Number(raw[0]) : Number(raw);
        try {
            return Number.isFinite(numeric) ? formatNumber(numeric, 'es', this.getNumberFormat()) : String(raw);
        } catch {
            return String(raw);
        }
    }

    /** Width in px of the text at the given font size (canvas metrics, no layout impact). */
    private measureTextWidth(text: string, fontSize: number): number {
        if (!this.measureCanvas) this.measureCanvas = document.createElement('canvas');
        const ctx = this.measureCanvas.getContext('2d');
        if (!ctx) return text.length * fontSize * 0.6; // rough fallback
        ctx.font = `700 ${fontSize}px ${this.family || 'Questrial'}`;
        return ctx.measureText(text).width;
    }

    /**
     * Largest font size (px) that fits a box. Glyph widths scale linearly with the font size,
     * so a single measurement at a reference size is enough:
     *   sizeByWidth = availableWidth / widthAtReference * reference
     *   sizeByHeight = availableHeight / lineHeight   (line-height is 1)
     */
    private computeFitSize(width: number, height: number, text: string): number {
        if (!text || width <= 0 || height <= 0) return this.minFontSize;
        const reference = 100;
        const widthAtReference = this.measureTextWidth(text, reference) || 1;
        const sizeByWidth = (width * reference) / widthAtReference;
        const sizeByHeight = height; // line-height: 1 → the line box is one em tall
        return Math.max(this.minFontSize, Math.floor(Math.min(sizeByWidth, sizeByHeight) * this.fitSafety));
    }

    // --- Image/value/suffix sizing: shared by both modes. KPI_CONFIG.USE_EDALITICS_SIZE_LOGIC only
    // moves where the value's +/- control lives (KPI dialog vs hover overlay on the panel) — image
    // and suffix are always adjusted from the dialog, for both modes. ---

    public edaHasImage(): boolean {
        return !!this.inject?.prefixImage;
    }

    private edaImageScale(): number {
        const raw = this.inject?.imageScale;
        const value = typeof raw === 'number' ? raw : this.defaultImageScale;
        return Math.min(this.maxImageScale, Math.max(this.minImageScale, value));
    }

    private edaScale(raw: any): number {
        const value = typeof raw === 'number' ? raw : this.defaultFontScale;
        return Math.min(this.maxFontScale, Math.max(this.minFontScale, value));
    }

    private edaSizeForScale(fit: number, scale: number): number {
        return Math.max(this.minFontSize, Math.round(fit * scale));
    }

    /**
     * Box (px) available to the value/suffix block: the container, minus the image's width share
     * and its gap, shrunk by a fixed safety margin. The margin exists because every size below
     * is computed from a canvas text measurement *before* the DOM renders — it can't be perfectly
     * exact (web font not loaded yet, synthetic bold, sub-pixel rounding), so every fit is solved
     * for a slightly smaller box than the real one. That is the one and only place slack is added;
     * nothing downstream needs to re-check or correct anything.
     */
    private edaTextBoxSize(): { width: number; height: number } {
        const el: HTMLElement | undefined = this.kpiContainer?.nativeElement;
        const width = el?.clientWidth ?? this.containerWidth;
        const height = el?.clientHeight ?? this.containerHeight;
        const imageFraction = this.edaHasImage() ? this.edaImageScale() : 0;
        const imageGap = this.edaHasImage() ? 12 : 0; // matches the row's 0.75rem gap
        return {
            width: Math.max(0, (width - imageGap) * (1 - imageFraction)) * this.edaSafetyMargin,
            height: height * this.edaSafetyMargin,
        };
    }

    private edaValueText(): string {
        return this.formatValue(this.inject?.value);
    }

    public edaSufixText(): string {
        return (this.inject?.sufix ?? '').toString().trim();
    }

    /** Inline: value and suffix share one line, sized together as a single string. */
    private edaInlineFit(): number {
        const { width, height } = this.edaTextBoxSize();
        const value = this.edaValueText();
        const sufix = this.edaSufixText();
        const text = sufix ? `${value} ${sufix}` : value;
        return this.computeFitSize(width, height, text);
    }

    /** Value's fit when stacked: solved against the top half of the box. */
    private edaValueFit(): number {
        if (!this.edaShouldStack()) return this.edaInlineFit();
        const { width, height } = this.edaTextBoxSize();
        return this.computeFitSize(width, height / 2, this.edaValueText());
    }

    /** Suffix's fit when stacked: solved against the bottom half of the box. */
    private edaSufixFit(): number {
        if (!this.edaShouldStack()) return this.edaInlineFit();
        const { width, height } = this.edaTextBoxSize();
        return this.computeFitSize(width, height / 2, this.edaSufixText());
    }

    /**
     * Stacked (number above, suffix below) only when the suffix is long enough to read as a unit
     * (3+ chars) and the panel's shape is "square-ish" rather than elongated: a wide panel keeps
     * both on one line; a squarer one stacks them. kpi+chart uses a lower threshold (5:4) than a
     * plain kpi (16:9) because the chart below eats most of the panel's height, leaving a squarer
     * strip for the value even on a panel that is itself quite wide.
     */
    public edaShouldStack(): boolean {
        const sufix = this.edaSufixText();
        if (sufix.length < 3) return false;
        const el = this.edaRatioElement();
        const width = el?.clientWidth ?? this.containerWidth;
        const height = el?.clientHeight ?? this.containerHeight;
        if (width <= 0 || height <= 0) return false;
        const ratio = this.inject?.showChart ? this.edaChartStackRatio : this.edaStackRatio;
        return (width / height) < ratio;
    }

    /**
     * Element whose box best represents the panel's settled shape. While the panel is actively
     * being resized, gridster keeps the item itself following the cursor at raw pixel size (not
     * snapped) and instead shows a separate `<gridster-preview>` overlay snapped to the target
     * grid cell — that overlay is what we want, since it already is the shape the panel will have
     * once released, with no pixel-by-pixel flicker before it settles. Otherwise, the panel card
     * itself (data-eda-panel-root) is just as good, and avoids the header/padding skewing the
     * KPI's own (smaller) content box.
     */
    private edaRatioElement(): HTMLElement | null {
        const root: HTMLElement | undefined = this.kpiContainer?.nativeElement;
        if (!root) return null;
        const item = root.closest('gridster-item');
        if (item?.classList.contains('gridster-item-resizing')) {
            const preview = item.closest('gridster')?.querySelector('gridster-preview') as HTMLElement | null;
            if (preview) return preview;
        }
        return root.closest('[data-eda-panel-root]');
    }

    /**
     * Rendered size: fit × scale, floored at minFontSize. At the default 100% scale this always
     * fits (computeFitSize solved for it); above 100% it can wrap/overflow, which is an explicit
     * admin choice via the scale control.
     */
    private edaValueSize(): number {
        return this.edaSizeForScale(this.edaValueFit(), this.edaScale(this.inject?.valueFontScale));
    }

    private edaSufixSize(): number {
        return this.edaSizeForScale(this.edaSufixFit(), this.edaScale(this.inject?.sufixFontScale));
    }

    public edaImageWrapStyle(): any {
        const pct = this.edaImageScale() * 100;
        return {
            flex: `0 0 ${pct}%`,
            width: `${pct}%`,
            'max-width': `${pct}%`,
            height: '100%',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'text-align': 'center',
            overflow: 'hidden',
        };
    }

    public edaImageTagStyle(): any {
        return {
            height: '100%',
            width: 'auto',
            'max-width': '100%',
            'object-fit': 'contain',
            'object-position': 'center',
            display: 'block',
            margin: 'auto',
        };
    }

    public edaTextWrapStyle(): any {
        const stacked = this.edaShouldStack();
        return {
            flex: '1 1 0%',
            'min-width': '0',
            height: '100%',
            display: 'flex',
            'flex-direction': stacked ? 'column' : 'row',
            'align-items': 'center',
            'justify-content': 'center',
            overflow: 'hidden',
        };
    }

    /**
     * The value never wraps: at the default 100% scale computeFitSize() already guarantees it
     * fits on one line, so nowrap + ellipsis is the right pairing (only reachable if the admin
     * manually scales above 100%) — letting it wrap would risk breaking a number mid-digit.
     */
    public edaValueStyle(): any {
        const stacked = this.edaShouldStack();
        const size = this.edaValueSize();
        return {
            'font-weight': 'bold',
            'font-size': `${size}px`,
            'line-height': '1',
            color: this.color,
            'font-family': this.family,
            'white-space': 'nowrap',
            'text-overflow': 'ellipsis',
            overflow: 'hidden',
            'max-width': '100%',
            'min-width': '0',
            'flex-shrink': stacked ? '1' : '0',
            'text-align': 'center',
            cursor: 'pointer',
        };
    }

    public edaSufixStyle(): any {
        const stacked = this.edaShouldStack();
        const size = this.edaSufixSize();
        return {
            'font-weight': 'bold',
            'font-size': `${size}px`,
            'line-height': '1.15',
            color: this.color,
            'font-family': this.family,
            'white-space': stacked ? 'normal' : 'nowrap',
            'overflow-wrap': stacked ? 'break-word' : 'normal',
            'word-break': 'normal',
            overflow: 'hidden',
            'max-width': '100%',
            'min-width': '0',
            'flex-shrink': '0',
            'text-align': 'center',
            'margin-top': stacked ? '0.1em' : '0',
            'margin-left': stacked ? '0' : '0.3em',
            cursor: 'pointer',
        };
    }

    // --- END image/value/suffix sizing ---

    // --- Hover +/- for the value (forks only — Edalitics adjusts the same inject.valueFontScale from the dialog instead) ---

    increaseFont(): void {
        const next = this.nextScaleWithSize(1);
        if (next !== null) this.applyScale(next);
    }

    decreaseFont(): void {
        const next = this.nextScaleWithSize(-1);
        if (next !== null) this.applyScale(next);
    }

    /**
     * Percentage actually rendered, relative to the size that fits (100% = as big as
     * the container allows). It is the effective value, so when the 10 px floor is
     * active the label stops at that percentage instead of showing a scale that is
     * not being applied.
     */
    getScalePercent(): number {
        return this.getControls().percent;
    }

    /** False when no bigger size is reachable (already at the fit). */
    canIncreaseFont(): boolean {
        return this.getControls().canUp;
    }

    /** False when no smaller size is reachable (minimum scale or 10 px floor). */
    canDecreaseFont(): boolean {
        return this.getControls().canDown;
    }

    /**
     * Percentage and +/- availability for the current fit and scale. It is computed
     * once per (fit, scale) because the three template bindings would otherwise
     * repeat the whole calculation several times per change detection cycle.
     */
    private getControls(): { percent: number; canUp: boolean; canDown: boolean } {
        const fit = this.edaValueFit();
        const scale = this.edaScale(this.inject?.valueFontScale);
        if (this.controlsCache.fit === fit && this.controlsCache.scale === scale) {
            return this.controlsCache;
        }
        const size = this.edaValueSize();
        this.controlsCache = {
            fit,
            scale,
            percent: fit > 0 ? Math.min(this.maxFontScale * 100, Math.round((size / fit) * 100)) : Math.round(this.defaultFontScale * 100),
            canUp: this.useHoverResize && this.nextScaleWithSize(1) !== null,
            canDown: this.useHoverResize && this.nextScaleWithSize(-1) !== null,
        };
        return this.controlsCache;
    }

    /**
     * Next scale (in the direction given) that actually changes the rendered size.
     * Steps that fall inside the 10 px floor (or that round to the same pixels) are
     * skipped, so the buttons never look stuck on very small panels.
     */
    private nextScaleWithSize(direction: 1 | -1): number | null {
        const fit = this.edaValueFit();
        if (fit <= 0) return null;
        const currentSize = this.edaValueSize();
        let scale = this.edaScale(this.inject?.valueFontScale);
        for (let i = 0; i < 50; i++) {
            scale = +(scale + direction * this.fontScaleStep).toFixed(2);
            if (scale > this.maxFontScale + 1e-9 || scale < this.minFontScale - 1e-9) return null;
            scale = Math.min(this.maxFontScale, Math.max(this.minFontScale, scale));
            const size = this.edaSizeForScale(fit, scale);
            if (direction > 0 ? size > currentSize : size < currentSize) return scale;
        }
        return null;
    }

    private applyScale(scale: number): void {
        this.inject.valueFontScale = Math.min(this.maxFontScale, Math.max(this.minFontScale, scale));
        this.onNotify.emit({ sufix: this.inject.sufix });
    }

    public updateChart(): void {
        if (this.inject.edaChart && this.edaChartComponent) {
            this.edaChartComponent.updateChart();
        }
    }

}
