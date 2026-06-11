import { Component, OnInit, Input, ViewChild, AfterViewInit, Output, EventEmitter, NgZone } from '@angular/core';
import { EdaChart } from './eda-chart';
import { BaseChartDirective } from 'ng2-charts';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';

@Component({
    standalone: true,
    selector: 'eda-chart',
    templateUrl: './eda-chart.component.html',
    imports: [FormsModule, CommonModule, NgChartsModule]
})

export class EdaChartComponent implements OnInit, AfterViewInit {
    @ViewChild('edaChart') edaChart: BaseChartDirective;
    @Output() onClick: EventEmitter<any> = new EventEmitter<any>();
    @Input() inject: EdaChart;

    public update: boolean;
    public chartPlugins = [  ChartDataLabels  ];
    

    constructor(private zone: NgZone) {
        this.update = true;
    }

    ngOnInit(): void { }

    public ngAfterViewInit(): void {
        this.edaChart.chart.options.onClick = (evt, activeEls, chart) => {
            if (activeEls.length === 0 || chart.getElementsAtEventForMode(<any>evt, 'nearest', { intersect: true }, true).length === 0) {
                return;
            }

            activeEls.forEach(point => {
                const dataset = chart.data.datasets[point.datasetIndex];
                const dataLabel = chart.data.labels[point.index];
                const datasetLabel = dataset.label || dataLabel;

                // We check if the chart is 'stackedbar100' because it has labels different from the others
                // In this case the label is the filter and the filter is the label by its nature
                const isStackedBar100 = this.inject['edaChart'] === 'stackedbar100';

                // Depending on whether it is stackedbar100 we assign one value or the other 
                const [filterBy, label] = isStackedBar100 ? [dataLabel, datasetLabel]: [datasetLabel, dataLabel];

                const value = chart.data.datasets[point.datasetIndex].data[point.index];
                // If dashboards are linked, do not filter.
                if (this.inject.linkedDashboardProps) {
                    const props = this.inject.linkedDashboardProps;
                    const url = window.location.href.slice( 0, window.location.href.indexOf('/dashboard')) +`/dashboard/${props.dashboardID}?${props.table}.${props.col}=${label}`
                    window.open(url, "_blank");
                }else{
                    // trigger the filter
                    this.zone.run(() => {
                        this.onClick.emit({ inx: point.index, label, value, filterBy });
                    });
                }
            })
        }
    }

    updateChartOptions(options: any) {
        this.update = false;
        this.edaChart.chart.config.options = options;
        this.updateChart();
        setTimeout(() => { this.update = true; }, 0);
    }

    updateChart() {
        this.edaChart.chart.update();
    }

}