import { Component, OnInit, Input, EventEmitter, Output, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { EdaKpi } from './eda-kpi';
import es from '@angular/common/locales/es';
import { EdaChartComponent } from '../component.index';

@Component({
    selector: 'eda-kpi',
    templateUrl: './eda-kpi.component.html'
})

export class EdaKpiComponent implements OnInit {
    @Input() inject: EdaKpi;
    @Output() onNotify: EventEmitter<any> = new EventEmitter();
    @ViewChild('kpiContainer') kpiContainer: ElementRef;
    @ViewChild('sufixContainer') sufixContainer: ElementRef;
    @ViewChild('EdaChart', { static: false }) edaChartComponent: EdaChartComponent;
    sufixClick: boolean = false;
    color: string;
    defaultColor = '#67757c';
    warningColor = '#ff8100';
    containerHeight: number = 20;
    containerWidth: number = 20;

    showChart: boolean = true;
    /* SDA CUSTOM */ private readonly minFontScale = 0.6;
    /* SDA CUSTOM */ private readonly maxFontScale = 2.0;
    /* SDA CUSTOM */ private readonly fontScaleStep = 0.1;
    /* SDA CUSTOM */ private readonly scaleTolerance = 0.15;
    /* SDA CUSTOM */ private baseWidth: number | undefined;
    /* SDA CUSTOM */ public isHovered = false;

    constructor() { }

    ngAfterViewInit() {
        this.initDimensions();
    }

    ngOnInit() {;
        try {
            registerLocaleData(es);
            /* SDA CUSTOM */ if (typeof this.inject?.fontScale !== 'number') {
                /* SDA CUSTOM */ this.inject.fontScale = 1;
            }
            /* SDA CUSTOM */ this.setBaseColor(this.inject?.color);
            /* SDA CUSTOM */ this.applyAlertColors();

        } catch (e) {
            console.log('No alert limits defined (alertLimits)');
            console.log(e);
        }
    }

    /* SDA CUSTOM */ setBaseColor(color: string): void {
        /* SDA CUSTOM */ if (color) {
            /* SDA CUSTOM */ this.defaultColor = color;
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ this.color = this.defaultColor;
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ applyAlertColors(): void {
        /* SDA CUSTOM */ if (this.inject.alertLimits?.length > 0) {
            /* SDA CUSTOM */ this.inject.alertLimits.forEach(alert => {
                /* SDA CUSTOM */ const operand = alert.operand, warningColor = alert.color;
                /* SDA CUSTOM */ const value1 = this.inject.value, value2 = alert.value;
                /* SDA CUSTOM */ switch (operand) {
                    /* SDA CUSTOM */ case '<': this.color = value1 < value2 ? warningColor : this.defaultColor; break;
                    /* SDA CUSTOM */ case '=': this.color = value1 === value2 ? warningColor : this.defaultColor; break;
                    /* SDA CUSTOM */ case '>': this.color = value1 > value2 ? warningColor : this.defaultColor; break;
                    /* SDA CUSTOM */ default: this.color = this.defaultColor;
                /* SDA CUSTOM */ }
            /* SDA CUSTOM */ });
        /* SDA CUSTOM */ }
    /* SDA CUSTOM */ }

    public initDimensions() {
        if (this.kpiContainer) {
            const widthKpiContainer = this.kpiContainer.nativeElement.offsetWidth;
            const heightKpiContainer = this.kpiContainer.nativeElement.offsetHeight;
            const sufixContainerReference = this.sufixContainer.nativeElement;

            if (widthKpiContainer > 0) {
                this.containerHeight = heightKpiContainer;
                this.containerWidth = widthKpiContainer;
                /* SDA CUSTOM */ if (!this.baseWidth) {
                    /* SDA CUSTOM */ this.baseWidth = widthKpiContainer;
                /* SDA CUSTOM */ }
            }

            //Auto margin
            sufixContainerReference.style.margin = "auto"
        }
    }

    setSufix(): void {
        this.sufixClick = !this.sufixClick;
        /* SDA CUSTOM */ this.onNotify.emit({ sufix: this.inject.sufix, fontScale: this.inject.fontScale })
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ onMouseEnter(): void {
        /* SDA CUSTOM */ this.isHovered = true;
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ onMouseLeave(): void {
        /* SDA CUSTOM */ this.isHovered = false;
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ shouldShowControls(): boolean {
        /* SDA CUSTOM */ return !!this.inject?.showResizeControls && this.isHovered;
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ increaseFont(): void {
        /* SDA CUSTOM */ this.updateFontScale(this.fontScaleStep);
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ decreaseFont(): void {
        /* SDA CUSTOM */ this.updateFontScale(-this.fontScaleStep);
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private updateFontScale(delta: number): void {
        /* SDA CUSTOM */ const current = typeof this.inject.fontScale === 'number' ? this.inject.fontScale : 1;
        /* SDA CUSTOM */ const next = this.clampFontScale(current + delta);
        /* SDA CUSTOM */ this.inject.fontScale = next;
        /* SDA CUSTOM */ if (this.containerWidth > 0) {
            /* SDA CUSTOM */ this.baseWidth = this.containerWidth;
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ this.onNotify.emit({ sufix: this.inject.sufix, fontScale: this.inject.fontScale });
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private clampFontScale(value: number): number {
        /* SDA CUSTOM */ return Math.max(this.minFontScale, Math.min(this.maxFontScale, value));
    }

    getStyle(): any {
        return { 'font-weight': 'bold', 'font-size': this.getFontSize(), display: 'flex', 'justify-content': 'center', color: this.color }
    }

    /* SDA CUSTOM */ // This function returns a string with the given font size (in px) based on the panel width and height
    getFontSize(): string {
        this.initDimensions();

        let resultSize: number = this.containerHeight / 2;
        let textLongitude = (this.inject.value + this.inject.sufix).length;
        const ratio = (  this.containerHeight / this.containerWidth ) ;

        const sufix = this.inject.sufix || '';

        textLongitude = this.inject.value.toString().length

        // Comprobaciones
        let textWidth = textLongitude * resultSize;
        // Redimensiono en funcion del ancho
        if ( ( textWidth > this.containerWidth )  && ( sufix.length < 4 ) ) resultSize = (this.containerWidth / textLongitude) * 1.4;
        // Redimensiono en función del alto
        if (resultSize > this.containerHeight   && ratio < 0.4  ) resultSize = this.containerHeight;
        // Última comprobación
        if (textLongitude * resultSize > this.containerWidth * 1.2   && ratio < 0.4  )  resultSize = resultSize / 1.5;
        // Si tengo un sufijo y es muy grande compruebo que no me pase
        if (sufix.length > 4 && this.containerHeight < (resultSize * 4) && this.containerWidth < textWidth) {
            resultSize = resultSize / 1.8;
        }
        // Si tengo ung gráfico lo hago más pequeño
        if (this.showChart) {
            resultSize = resultSize / 1.8;
        }

        /* SDA CUSTOM */ const scale = this.getEffectiveScale();
        /* SDA CUSTOM */ resultSize = resultSize * scale;

        return resultSize.toFixed().toString() + 'px';
    }

    /* SDA CUSTOM */ private getEffectiveScale(): number {
        /* SDA CUSTOM */ const scale = typeof this.inject.fontScale === 'number' ? this.inject.fontScale : 1;
        /* SDA CUSTOM */ if (!this.baseWidth || this.baseWidth <= 0 || this.containerWidth <= 0) {
            /* SDA CUSTOM */ return scale;
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ const ratio = this.containerWidth / this.baseWidth;
        /* SDA CUSTOM */ const withinTolerance = ratio >= (1 - this.scaleTolerance) && ratio <= (1 + this.scaleTolerance);
        /* SDA CUSTOM */ return withinTolerance ? scale : 1;
    /* SDA CUSTOM */ }

    public updateChart(): void {
        if (this.inject.edaChart && this.edaChartComponent) {
            this.edaChartComponent.updateChart();
        }
    }

}
