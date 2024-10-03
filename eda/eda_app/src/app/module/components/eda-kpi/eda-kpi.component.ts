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

    public showChart: boolean = true;

    constructor() { }

    ngAfterViewInit() {
        const widthKpiContainer = this.kpiContainer.nativeElement.offsetWidth;

        const heightKpiContainer = this.kpiContainer.nativeElement.offsetHeight;

        const sufixContainerReference = this.sufixContainer.nativeElement;

        if (widthKpiContainer > 0) {
            this.containerHeight = heightKpiContainer;
            this.containerWidth = widthKpiContainer;
        }

        //Auto margin
        sufixContainerReference.style.margin = "auto"
    }

    ngOnInit() {;
        try {
            registerLocaleData(es);

            console.log('KPICOMPONENT -> EDACHART',this.inject.edaChart.chartOptions);
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

            console.log('onInit inject', this.inject.edaChart.chartOptions);
        } catch (e) {
            console.log('No alert limits defined (alertLimits)');
            console.log(e);
        }
    }

    setSufix(): void {
        this.sufixClick = !this.sufixClick;
        this.onNotify.emit({ sufix: this.inject.sufix })
    }

    getStyle(): any {
        return { 'font-weight': 'bold', 'font-size': this.getFontSize(), display: 'flex', 'justify-content': 'center', color: this.color }
    }

    /**
     * This function returns a string with the given font size (in px) based on the panel width and height 
     * @returns {string}
    */
    getFontSize(): string {
        let resultSize: number = this.containerHeight / 2;
        let textLongitude = (this.inject.value + this.inject.sufix).length;

        const sufix = this.inject.sufix || ''

        if (sufix.length > 3) {
            // Provoco saltos de linea en sufijos largos
            textLongitude = this.inject.value.toString().length
        }

        let textWidth = textLongitude * resultSize;

        if (textWidth > this.containerWidth) resultSize = (this.containerWidth / textLongitude) * 1.1;

        if (resultSize > this.containerHeight) resultSize = this.containerHeight;

        if (textLongitude * resultSize > this.containerWidth * 1.2) resultSize = resultSize / 1.5;

        if (sufix.length > 3 && this.containerHeight < (resultSize * 4) && this.containerWidth < textWidth) {
            resultSize = resultSize / 1.8;
        }
        
        // default font size
        if (resultSize < 90) resultSize = 90;
        
        return resultSize.toFixed().toString() + 'px';
    }

    public updateChart(): void {
        console.log('updateChart');
        console.log(this.edaChartComponent.inject.chartOptions);
        if (this.inject.edaChart && this.edaChartComponent) {

            // this.edaChartComponent.updateChartOptions(this.edaChartComponent.inject.chartOptions);
        }
    }

}
