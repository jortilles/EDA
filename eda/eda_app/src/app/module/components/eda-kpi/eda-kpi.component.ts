import { Component, OnInit, OnDestroy, Input, EventEmitter, Output, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, HostBinding } from '@angular/core';
import { StyleProviderService } from '@eda/services/service.index';
import { formatNumber, registerLocaleData } from '@angular/common';
import { EdaKpi } from './eda-kpi';
import es from '@angular/common/locales/es';
import { EdaBarD3Component } from '../eda-bar-d3/eda-bar.component';
import { EdaLineComponent } from '../eda-line-d3/eda-line.component';
import { EdaAreaComponent } from '../eda-area-d3/eda-area.component';

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
    /** Smallest size we are willing to render (below it the text would be unreadable). */
    private readonly minFontSize = 10;
    /** Safety margin so sub-pixel rounding and synthetic-bold width never make the text overflow. */
    private readonly fitSafety = 0.96;
    /** Width share reserved for the inline prefix image, matching getImageStyle()'s 50% cap. */
    private readonly imageWidthShare = 0.35;
    /** Reusable canvas context used to measure the rendered text (no layout thrashing). */
    private measureCanvas?: HTMLCanvasElement;
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

    /** Recalculates the font size whenever the panel itself resizes (drag, zoom, layout change...). */
    private observeContainerResize(): void {
        const realContainer: HTMLElement | undefined = this.kpiContainer?.nativeElement
            ?.parentElement
            ?.parentElement
            ?.parentElement;
        if (!realContainer || typeof ResizeObserver === 'undefined') return;
        this.resizeObserver = new ResizeObserver(() => {
            this.initDimensions();
            this.cdr.detectChanges();
        });
        this.resizeObserver.observe(realContainer);
    }

    ngOnInit() {
        try {
            registerLocaleData(es);

            if (this.inject.kpiColor) {
                this.defaultColor = this.inject.kpiColor;
                this.color = this.inject.kpiColor;
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
            // Move up three levels from the original container
            const realContainer = this.kpiContainer.nativeElement
                ?.parentElement
                ?.parentElement
                ?.parentElement;

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
        this.onNotify.emit({ sufix: this.inject.sufix })
    }

    /** Format string for the value's `number` pipe - fixes it at exactly `inject.decimals`
     *  fraction digits (matching the column's configured "Número de decimals") when known,
     *  otherwise keeps the original 0-10 range. */
    getNumberFormat(): string {
        const d = this.inject.decimals;
        return d != null ? `1.${d}-${d}` : '1.0-10';
    }

    getStyle(): any {
        return {
            'font-weight': 'bold',
            'font-size': this.getFontSize(),
            'line-height': '1',
            color: this.color,
            'font-family': this.family,
        };
    }

    /** Suffix's own style: same base size as the value, independently nudged by
     * inject.modifiedSufixFontPoints (same additive-px pattern as the value's modifiedFontPoints,
     * defaulting to 0 so it matches the value's size exactly when untouched). */
    getSufixStyle(): any {
        return {
            'font-weight': 'bold',
            'font-size': `${this.getSufixFontSizePx()}px`,
            'line-height': '1',
            color: this.color,
            'font-family': this.family,
        };
    }

    private getSufixFontSizePx(): number {
        const base = this.computeValueFontSizePx();
        return this.inject.modifiedSufixFontPoints
            ? Math.max(this.minFontSize, base + this.inject.modifiedSufixFontPoints)
            : base;
    }

    /** Prefix image's own size: same base size as the value, independently nudged by
     * inject.modifiedImageFontPoints (same additive-px pattern, defaults to 0 = same as the value,
     * matching the previous height:1em behaviour). */
    getImageStyle(): any {
        const base = this.computeValueFontSizePx();
        const size = this.inject.modifiedImageFontPoints
            ? Math.max(this.minFontSize, base + this.inject.modifiedImageFontPoints)
            : base;
        const maxW = this.containerWidth > 0 ? `${Math.round(this.containerWidth * 0.5)}px` : '50%';
        return {
            height: `${size}px`,
            'max-height': `${size}px`,
            width: 'auto',
            'max-width': maxW,
            'object-fit': 'contain',
            'flex-shrink': '0',
            'vertical-align': 'middle',
            display: 'inline-block',
        };
    }

    /** Value + suffix exactly as rendered by the template, for width measurement. */
    private getDisplayText(): string {
        const value = formatNumber(this.inject.value, 'es', this.getNumberFormat());
        const sufix = this.inject.sufix || '';
        return sufix ? `${value} ${sufix}` : value;
    }

    /** Width in px that `text` would take at `fontSize`, measured with a hidden canvas (no layout impact). */
    private measureTextWidth(text: string, fontSize: number): number {
        if (!this.measureCanvas) this.measureCanvas = document.createElement('canvas');
        const ctx = this.measureCanvas.getContext('2d');
        if (!ctx) return text.length * fontSize * 0.6; // rough fallback
        ctx.font = `700 ${fontSize}px ${this.family || 'Questrial'}`;
        return ctx.measureText(text).width;
    }

    /**
     * Largest font size (px) that fits `text` inside a `width` x `height` box. Glyph widths scale
     * linearly with the font size, so a single reference measurement is enough:
     *   sizeByWidth  = availableWidth / widthAtReference * reference
     *   sizeByHeight = availableHeight   (line-height is 1, so the line box is one em tall)
     */
    private computeFitSize(width: number, height: number, text: string): number {
        if (!text || width <= 0 || height <= 0) return this.minFontSize;
        const reference = 100;
        const widthAtReference = this.measureTextWidth(text, reference) || 1;
        const sizeByWidth = (width * reference) / widthAtReference;
        const sizeByHeight = height;
        return Math.max(this.minFontSize, Math.floor(Math.min(sizeByWidth, sizeByHeight) * this.fitSafety));
    }

    /**
     * Base font size (px) that fits the value (plus suffix and prefix image, if any) inside the
     * panel, measured against the actual rendered text width instead of counting characters, plus
     * the value's own modifiedFontPoints adjustment. Suffix and image start from this same base
     * (see getSufixFontSizePx()/getImageStyle()) and nudge it independently from there.
     */
    private computeValueFontSizePx(): number {
        this.initDimensions();

        const hasImage = !!this.inject.prefixImage;
        const availableWidth = this.containerWidth * (hasImage ? 1 - this.imageWidthShare : 1);
        // When there's a chart below, the value only occupies the top 30% of the panel's height
        // (see the template's `height: 30%` on #kpiContainer) — initDimensions() measures the full
        // panel, so that share has to be applied here too.
        const availableHeight = this.containerHeight * (this.inject.showChart ? 0.3 : 1);

        let resultSize = this.computeFitSize(availableWidth, availableHeight, this.getDisplayText());

        const isMobile = window.innerWidth < 640;
        if (isMobile) {
            resultSize = Math.min(resultSize, 40);
        }
        if (this.inject.modifiedFontPoints) {
            resultSize = Math.max(this.minFontSize, resultSize + this.inject.modifiedFontPoints);
        }
        return resultSize;
    }

    /**
     * This function returns a string with the font size (in px) that fits the value (plus
     * suffix and prefix image, if any) inside the panel, measured against the actual rendered
     * text width instead of counting characters.
     * @returns {string}
    */
    getFontSize(): string {
        return this.computeValueFontSizePx().toFixed().toString() + 'px';
    }

    public updateChart(): void {
        if (this.inject.edaChart && this.edaChartComponent) {
            this.edaChartComponent.updateChart();
        }
    }

}
