import { Component, OnInit, Input, ViewChild, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { EdaChart } from './eda-chart';
import { BaseChartDirective } from 'ng2-charts';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { ChartsColors } from '@eda/configs/index';

@Component({
    selector: 'eda-chart',
    templateUrl: './eda-chart.component.html',
    styleUrls: []
})

export class EdaChartComponent implements OnInit, AfterViewInit {
    @ViewChild('edaChart') edaChart: BaseChartDirective;
    @Output() onClick: EventEmitter<any> = new EventEmitter<any>();
    @Input() inject: EdaChart;

    public update: boolean;
    public chartPlugins = [  ChartDataLabels  ];
    public static defaultChartColors: any[] = EdaChartComponent.generateChartColors();
    public static defaultPieColors: any[] = EdaChartComponent.generatePiecolors();

    public static generateChartColors(iterations?: number) {
        let MAX_ITERATIONS = 200;
        let out = [];
        let col = ChartsColors;

        for (let i = 0; i < MAX_ITERATIONS; i += 10) {
            for (let j = 0; j < col.length; j++) {
                out.push(
                    {
                        backgroundColor: `rgba(${(col[j][0] + i) % 255}, ${(col[j][1] + i) % 255}, ${(Math.abs(col[j][2] + i)) % 255}, 0.9)`,
                        borderColor: `rgba(${(col[j][0] + i) % 255}, ${(col[j][1] + i) % 255}, ${(Math.abs(col[j][2] + i)) % 255}, 1)`,
                        pointBackgroundColor: `rgba(${(col[j][0] + i) % 255}, ${(col[j][1] + i) % 255}, ${(Math.abs(col[j][2] + i)) % 255}, 0.9)`,
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: `rgba(${(col[j][0] + i) % 255}, ${(col[j][1] + i) % 255}, ${(col[j][2] - i) % 255}, 0.9)`

                    }
                )
            }
        }
        return out;
    }

    public static generatePiecolors() {

        let MAX_ITERATIONS = 1000;
        let out = [{ backgroundColor: [], borderColor: [] }];
        let col = ChartsColors;

        for (let i = 0; i < MAX_ITERATIONS; i += 50) {

            for (let j = 0; j < col.length; j++) {
                out[0].backgroundColor.push(
                    `rgba(${(col[j][0] + i) % 255}, ${(col[j][1] + i) % 255}, ${(Math.abs(col[j][2] + i)) % 255}, 0.8)`);
                out[0].borderColor.push(`rgba(255,255,255,1)`)
            }
        }
        return out;

    }

    constructor() {
        this.update = true;
    }

    ngOnInit(): void { }

    public ngAfterViewInit(): void {
        this.edaChart.chart.options.onClick = (evt, activeEls, chart) => {
            if (activeEls.length === 0 || chart.getElementsAtEventForMode(<any>evt, 'nearest', { intersect: true }, true).length === 0) {
                return;
            }

            activeEls.forEach(point => {
                let filterBy = chart.data.datasets[point.datasetIndex].label || chart.data.labels[point.index];
                const label = chart.data.labels[point.index];
                const value = chart.data.datasets[point.datasetIndex].data[point.index];
                // Si vinculo los dashboards no filtro.
                if (this.inject.linkedDashboardProps) {
                    const props = this.inject.linkedDashboardProps;
                    const url = window.location.href.slice( 0, window.location.href.indexOf('/dashboard')) +`/dashboard/${props.dashboardID}?${props.table}.${props.col}=${label}`
                    window.open(url, "_blank");
                }else{
                    //lanzo el filtro
                    this.onClick.emit({ inx: point.index, label, value, filterBy })
                }
            })
        }
    }


    chartHovered({ event, active }: { event: MouseEvent, active: {}[] }): void { }

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
