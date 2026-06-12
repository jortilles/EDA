import { Component, OnInit, OnChanges, OnDestroy, SimpleChanges, Input, HostBinding,
         ChangeDetectorRef, AfterViewInit, ViewChild, ElementRef, Self, Inject, LOCALE_ID } from '@angular/core';
import { CommonModule, getLocaleMonthNames, FormStyle, TranslationWidth } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { EdaKpiTrend, TrendPeriodGroup } from './eda-kpi-trend';
import { EdaChartComponent } from '../eda-chart/eda-chart.component';
import { StyleProviderService } from '@eda/services/service.index';

@Component({
    standalone: true,
    selector: 'eda-kpi-trend',
    templateUrl: './eda-kpi-trend.component.html',
    styleUrls: ['./eda-kpi-trend.component.css'],
    imports: [CommonModule, FormsModule, DropdownModule, EdaChartComponent]
})
export class EdaKpiTrendComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
    @Input() inject: EdaKpiTrend;
    @ViewChild('edaTrendChart') edaTrendChart: EdaChartComponent;
    @ViewChild('kpiLeft') kpiLeftRef: ElementRef;

    @HostBinding('style.display') readonly hostDisplay = 'block';
    @HostBinding('style.position') readonly hostPosition = 'relative';
    @HostBinding('style.width') readonly hostWidth = '100%';
    @HostBinding('style.height') readonly hostHeight = '100%';

    // ── Local properties: the template NEVER accesses inject.X directly ──
    displayKpiValue: number = 0;
    displaySpyValue: number | null = null;
    displayVsPercent: number | null = null;
    displayCurrentLabel: string = '';
    displayPreviousLabel: string = '';
    displayPeriodTitle: string = '';
    displayComparisonLabel: string = '';
    displaySufix: string = '';
    displayCurrentColor: string = '#5B8AF0';
    displayPreviousColor: string = '#F5A623';
    displayAvailableComparisons: { key: string; label: string }[] = [];
    edaChartInject: any = null;
    selectedComparisonKey: string = '';

    // Layout
    isPortrait: boolean = false;
    private _resizeObs: ResizeObserver | null = null;

    // KPI Style
    color: string = '#67757c';
    family: string = 'inherit';
    modifiedFontPoints: number = 0;

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
        const host = this.hostRef.nativeElement as HTMLElement;
        this._resizeObs = new ResizeObserver(() => {
            const portrait = host.offsetHeight > host.offsetWidth ;
            if (portrait !== this.isPortrait) {
                this.isPortrait = portrait;
                this.cdr.detectChanges();
            }
        });
        this._resizeObs.observe(host);
        this.cdr.detectChanges();
    }

    ngOnDestroy(): void {
        this._resizeObs?.disconnect();
    }

    /** Synchronizes all local properties from inject */
    private _syncFromInject(): void {
        if (!this.inject) return;

        if (this.inject.kpiColor) this.color = this.inject.kpiColor;
        this.modifiedFontPoints = this.inject.modifiedFontPoints ?? 0;

        this.displayKpiValue = this.inject.kpiValue ?? 0;
        this.displaySpyValue = this.inject.spyValue ?? null;
        this.displayVsPercent = this.inject.vsPercent ?? null;
        this.displayCurrentLabel = this.inject.currentPeriodLabel || '';
        this.displayPreviousLabel = this.inject.previousPeriodLabel || '';
        this.displayPeriodTitle = this.inject.periodTitle || '';
        this.displayComparisonLabel = this.inject.comparisonLabel || '';
        this.displaySufix = this.inject.sufix || '';
        this.displayCurrentColor = this.inject.currentYearColor || '#5B8AF0';
        this.displayPreviousColor = this.inject.previousYearColor || '#F5A623';
        this.displayAvailableComparisons = this.inject.availableComparisons || [];
        this.edaChartInject = this.inject.edaChart;

        this.selectedComparisonKey = this.inject.selectedComparisonKey
            || this.displayAvailableComparisons[0]?.key
            || '';
    }

    /** Called when the user changes the dropdown */
    onComparisonChange(): void {
        const groups: TrendPeriodGroup[] = this.inject?.periodGroups;
        if (!groups) return;

        const currentGroup = groups.find(g => g.key === this.inject.currentKey);
        const compGroup = this.selectedComparisonKey
            ? groups.find(g => g.key === this.selectedComparisonKey) || null
            : null;

        if (!currentGroup) return;

        const result = this._recalculate(currentGroup, compGroup);
        this.displayKpiValue = result.kpiValue;
        this.displaySpyValue = result.spyValue;
        this.displayVsPercent = result.vsPercent;
        this.displayPreviousLabel = compGroup?.label || '';

        const c0 = this.displayCurrentColor;
        const c1 = this.displayPreviousColor;
        const compLabel = this.displayComparisonLabel;

        const newDatasets: any[] = [{
            label: this.inject.header,
            data: result.currentSeries,
            type: 'bar',
            borderRadius: 2,
            order: 2,
            backgroundColor: c0,
            borderColor: c0,
            datalabels: { display: false }
        }];
        if (compGroup) {
            newDatasets.push({
                label: compLabel,
                data: result.previousSeries,
                type: 'line',
                pointRadius: 2,
                pointHoverRadius: 4,
                borderDash: [4, 3],
                fill: false,
                tension: 0.3,
                order: 1,
                backgroundColor: c1,
                borderColor: c1,
                datalabels: { display: false }
            });
        }

        this.edaChartInject = {
            ...this.inject.edaChart,
            chartLabels: result.labels,
            chartDataset: newDatasets,
            chartColors: newDatasets.map(d => ({ backgroundColor: d.backgroundColor, borderColor: d.borderColor }))
        };
    }

    private _recalculate(
        currentGroup: TrendPeriodGroup,
        compGroup: TrendPeriodGroup | null
    ): { kpiValue: number; spyValue: number | null; vsPercent: number | null;
         labels: string[]; currentSeries: (number | null)[]; previousSeries: (number | null)[] } {

        const dec = this.inject?.decimals || 0;
        const fmt = this.inject?.dateFormat || 'month';

        const currentMap = new Map(currentGroup.entries.map(e => [e.period, e.value]));
        const compMap = compGroup ? new Map(compGroup.entries.map(e => [e.period, e.value])) : null;

        const allPeriods = new Set<number>(currentMap.keys());
        if (compMap) compMap.forEach((_, k) => allPeriods.add(k));
        const sortedPeriods = Array.from(allPeriods).sort((a, b) => a - b);

        const labels = sortedPeriods.map(p => this._periodLabel(p, fmt));
        const currentSeries = sortedPeriods.map(p => currentMap.get(p) ?? null);
        const previousSeries = compMap ? sortedPeriods.map(p => compMap.get(p) ?? null) : [];

        const kpiValue = this._round(currentGroup.entries.reduce((s, e) => s + e.value, 0), dec);
        let spyValue: number | null = null;
        if (compMap) {
            const curPeriods = Array.from(currentMap.keys());
            spyValue = this._round(curPeriods.reduce((s, p) => s + (compMap.get(p) || 0), 0), dec);
        }
        const vsPercent = (spyValue !== null && spyValue !== 0)
            ? Math.round(((kpiValue - spyValue) / spyValue) * 1000) / 10
            : null;

        return { kpiValue, spyValue, vsPercent, labels, currentSeries, previousSeries };
    }

    private _periodLabel(period: number, format: string): string {
        if (format === 'month') {
            const months = getLocaleMonthNames(this.locale, FormStyle.Standalone, TranslationWidth.Abbreviated);
            const raw = months[(period - 1) % 12];
            if (!raw) return String(period);
            return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/\.$/, '');
        }
        if (format === 'week') return 'Sem ' + String(period);
        return String(period);
    }

    private _round(value: number, decimals: number): number {
        if (!decimals) return Math.round(value);
        return Number(value.toFixed(decimals));
    }

    getValueStyle(): any {
        return {
            color: this.color,
            'font-family': this.family,
            'font-size': this._computeValueFontSize()
        };
    }

    private _computeValueFontSize(): string {
        try {
            const host = this.hostRef.nativeElement as HTMLElement;
            const panelH = host.offsetHeight || 120;
            const panelW = host.offsetWidth || 200;
            const colEl = this.kpiLeftRef?.nativeElement as HTMLElement | undefined;
            const colW = (colEl?.offsetWidth || (this.isPortrait ? panelW : panelW * 0.4)) - 16;
            const kpiAreaH = this.isPortrait ? panelH * 0.3 : panelH;
            const text = this.formatValue(this.displayKpiValue) + this.displaySufix;
            const charCount = Math.max(text.length, 1);
            let size = Math.min(kpiAreaH * 0.22, colW / charCount * 1.6);
            size = Math.max(12, Math.min(size, 34));
            size = Math.max(8, size + (this.inject?.modifiedFontPoints ?? this.modifiedFontPoints));
            return size.toFixed(0) + 'px';
        } catch {
            return '22px';
        }
    }

    formatValue(value: number): string {
        if (value == null) return '';
        const abs = Math.abs(value);
        const sign = value < 0 ? '-' : '';
        if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (abs >= 1_000) return sign + (abs / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
        return sign + abs.toLocaleString('es');
    }

    absVal(v: number): number { return Math.abs(v); }

    public updateChart(): void {
        if (this.inject?.edaChart) {
            this.edaChartInject = { ...this.inject.edaChart };
            this.cdr.detectChanges();
            if (this.edaTrendChart) {
                this.edaTrendChart.updateChart();
            }
        }
    }
}
