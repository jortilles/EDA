import { Component, OnInit, OnChanges, SimpleChanges, Input, HostBinding,
         ChangeDetectorRef, AfterViewInit, Self, ElementRef, Inject, LOCALE_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EdaKpiDeviation } from './eda-kpi-deviation';
import { StyleProviderService } from '@eda/services/service.index';

@Component({
    standalone: true,
    selector: 'eda-kpi-deviation',
    templateUrl: './eda-kpi-deviation.component.html',
    styleUrls: ['./eda-kpi-deviation.component.css'],
    imports: [CommonModule]
})
export class EdaKpiDeviationComponent implements OnInit, OnChanges, AfterViewInit {
    @Input() inject: EdaKpiDeviation;

    @HostBinding('style.display') readonly hostDisplay = 'block';
    @HostBinding('style.position') readonly hostPosition = 'relative';
    @HostBinding('style.width') readonly hostWidth = '100%';
    @HostBinding('style.height') readonly hostHeight = '100%';

    displayValue: number = 0;
    displayVsPercent: number | null = null;
    displayHeader: string = '';
    positiveColor: string = '#22a55b';
    negativeColor: string = '#e53e3e';

    // Deviation bar
    barFillLeft: number = 50;
    barFillWidth: number = 0;
    markerLeft: number = 50;
    barScale: number = 100;

    color: string = '#67757c';
    family: string = 'inherit';

    constructor(
        private styleProviderService: StyleProviderService,
        private cdr: ChangeDetectorRef,
        @Self() private hostRef: ElementRef,
        @Inject(LOCALE_ID) private locale: string
    ) {
        this.color = this.styleProviderService.panelFontColor.source['_value'] || '#67757c';
        this.family = this.styleProviderService.panelFontFamily.source['_value'] || 'inherit';
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['inject'] && this.inject) {
            this._syncFromInject();
        }
    }

    ngOnInit(): void {
        this._syncFromInject();
    }

    ngAfterViewInit(): void {
        this.cdr.detectChanges();
    }

    private _syncFromInject(): void {
        if (!this.inject) return;

        this.displayValue = this.inject.value ?? 0;
        this.displayVsPercent = this.inject.vsPercent ?? null;
        this.displayHeader = this.inject.header || '';
        this.positiveColor = this.inject.positiveColor || '#22a55b';
        this.negativeColor = this.inject.negativeColor || '#e53e3e';

        this.color = this.inject.kpiColor
            || ((this.displayVsPercent ?? 0) >= 0 ? this.positiveColor : this.negativeColor);

        this._computeBar();
    }

    private _computeBar(): void {
        if (this.displayVsPercent === null) {
            this.barFillLeft = 0;
            this.barFillWidth = 0;
            this.markerLeft = 0;
            this.barScale = 100;
            return;
        }
        // Dynamic scale: increases in steps of 100 (minimum 100)
        this.barScale = Math.max(100, Math.ceil(Math.abs(this.displayVsPercent) / 100) * 100);
        const ratio = Math.min(Math.abs(this.displayVsPercent) / this.barScale, 1);

        if (this.displayVsPercent >= 0) {
            // 0 on the left, +barScale on the right
            this.barFillLeft = 0;
            this.barFillWidth = ratio * 100;
            this.markerLeft = ratio * 100;
        } else {
            // -barScale on the left, 0 on the right
            this.barFillLeft = (1 - ratio) * 100;
            this.barFillWidth = ratio * 100;
            this.markerLeft = (1 - ratio) * 100;
        }
    }

    get fillColor(): string {
        return (this.displayVsPercent ?? 0) >= 0 ? this.positiveColor : this.negativeColor;
    }

    /** Track color (bar background): soft tint of the fill color */
    get trackColor(): string {
        return this.fillColor + '28';
    }

    get isPositive(): boolean {
        return (this.displayVsPercent ?? 0) >= 0;
    }

    getContainerStyle(): any {
        return { 'font-size': this._computeValueFontSize() };
    }

    getValueStyle(): any {
        const c = this._alertColor()
            || this.inject?.kpiColor
            || ((this.displayVsPercent ?? 0) >= 0 ? this.positiveColor : this.negativeColor);
        return { color: c, 'font-family': this.family };
    }

    private _alertColor(): string | null {
        const limits: any[] = this.inject?.alertLimits;
        if (!limits?.length || this.displayVsPercent === null) return null;
        const pct = this.displayVsPercent;
        for (const a of limits) {
            const thr = Number(a.value);
            if (a.operand === '<' && pct < thr) return a.color;
            if (a.operand === '=' && pct === thr) return a.color;
            if (a.operand === '>' && pct > thr) return a.color;
        }
        return null;
    }

    private _computeValueFontSize(): string {
        try {
            const host = this.hostRef.nativeElement as HTMLElement;
            const panelH = host.offsetHeight || 120;
            const panelW = host.offsetWidth || 200;
            const text = this.formatValue(this.displayValue);
            const charCount = Math.max(text.length, 1);
            let size = Math.min(panelH * 0.3, panelW / charCount * 1.5);
            size = Math.max(14, Math.min(size, 52));
            size = Math.max(8, size + (this.inject?.modifiedFontPoints || 0));
            return size.toFixed(0) + 'px';
        } catch {
            return '28px';
        }
    }

    formatValue(value: number): string {
        if (value == null) return '';
        const abs = Math.abs(value);
        const sign = value < 0 ? '-' : '';
        if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (abs >= 1_000) return sign + (abs / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
        return sign + abs.toLocaleString(this.locale);
    }

    public updateChart(): void {
        this._syncFromInject();
        this.cdr.detectChanges();
    }
}
