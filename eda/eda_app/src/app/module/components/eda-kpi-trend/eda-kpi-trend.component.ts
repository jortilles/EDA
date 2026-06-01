import { Component, OnInit, Input, HostBinding, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EdaKpiTrend } from './eda-kpi-trend';
import { EdaChartComponent } from '../eda-chart/eda-chart.component';
import { StyleProviderService } from '@eda/services/service.index';

@Component({
    standalone: true,
    selector: 'eda-kpi-trend',
    templateUrl: './eda-kpi-trend.component.html',
    styleUrls: ['./eda-kpi-trend.component.css'],
    imports: [CommonModule, EdaChartComponent]
})
export class EdaKpiTrendComponent implements OnInit, AfterViewInit {
    @Input() inject: EdaKpiTrend;

    @HostBinding('style.display') readonly hostDisplay = 'block';
    @HostBinding('style.position') readonly hostPosition = 'relative';
    @HostBinding('style.width') readonly hostWidth = '100%';
    @HostBinding('style.height') readonly hostHeight = '100%';

    color: string;
    family: string;

    constructor(
        private styleProviderService: StyleProviderService,
        private cdr: ChangeDetectorRef
    ) {
        this.color = this.styleProviderService.panelFontColor.source['_value'] || '#67757c';
        this.family = this.styleProviderService.panelFontFamily.source['_value'] || 'inherit';
    }

    ngOnInit(): void {
        if (this.inject?.kpiColor) {
            this.color = this.inject.kpiColor;
        }
    }

    ngAfterViewInit(): void {
        this.cdr.detectChanges();
    }

    getValueStyle(): any {
        return {
            color: this.color,
            'font-family': this.family,
        };
    }

    formatValue(value: number): string {
        if (value == null) return '';
        const abs = Math.abs(value);
        const sign = value < 0 ? '-' : '';
        if (abs >= 1_000_000) {
            return sign + (abs / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (abs >= 1_000) {
            return sign + (abs / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        return sign + abs.toLocaleString('es');
    }

    absVal(v: number): number {
        return Math.abs(v);
    }
}
