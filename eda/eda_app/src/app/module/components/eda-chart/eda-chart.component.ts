import { Component, OnInit, Input, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { EdaChart } from './eda-chart';
import { BaseChartDirective, Color } from 'ng2-charts';

@Component({
    selector: 'eda-chart',
    templateUrl: './eda-chart.component.html',
    styleUrls: []
})

export class EdaChartComponent implements OnInit, OnChanges {
    @ViewChild('edaChart', { static: false }) edaChart: BaseChartDirective;
    @Input() inject: EdaChart;

    public update: boolean;

    public static defaultChartColors: Color[] = EdaChartComponent.generateChartColors();
    /* [
        { // main
            backgroundColor: 'rgba(53,115,136,0.5)',
            borderColor: 'rgba(53,115,136,1)',
            pointBackgroundColor: 'rgba(53,115,136,1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(53,115,136,0.8)'
        },
        { // dark grey
            backgroundColor: 'rgba(42,126,104,0.5)',
            borderColor: 'rgba(42,126,104,1)',
            pointBackgroundColor: 'rgba(42,126,104,1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(42,126,104,1)'
        },
        { // red
            backgroundColor: 'rgba(23,90,140,0.5)',
            borderColor: 'rgba(23,90,140,1)',
            pointBackgroundColor: 'rgba(23,90,140,1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(23,90,140,0.8)'
        },
        { // dark grey
            backgroundColor: 'rgba(153, 81, 146,0.5)',
            borderColor: 'rgba(153, 81, 146,1)',
            pointBackgroundColor: 'rgba(153, 81, 146,1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(153, 81, 146,1)'
        },
    ];
    */
    public static defaultPieColors: Color[] = EdaChartComponent.generatePiecolors();
    /* [
        {
            backgroundColor: [
                'rgba(53,115,136,0.5)',
                'rgba(42,126,104,0.5)',
                'rgba(23,90,140,0.5)',
                'rgba(153, 81, 146,0.5)'
            ],
            borderColor: [
                'rgba(255,255,255,1)',
                'rgba(255,255,255,1)',
                'rgba(255,255,255,1)',
                'rgba(255,255,255,1)'
            ]
        }
    ];
    */

    private static generateChartColors(iterations?: number) {
        let MAX_ITERATIONS = 200;
        let out = [];
        let col =
            [
                [0, 156, 114],
                [5, 81, 138],
                [222, 150, 16],
                [158, 6, 52]
            ]

        for (let i = 0; i < MAX_ITERATIONS; i += 50) {
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

    private static generatePiecolors() {

        let MAX_ITERATIONS = 1000;
        let out = [{ backgroundColor: [], borderColor: [] }];
        let col =
            [
                [0, 156, 114],
                [5, 81, 138],
                [222, 150, 16],
                [158, 6, 52]
            ]

        for (let i = 0; i < MAX_ITERATIONS; i += 50) {

            for (let j = 0; j < 4; j++) {
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

    ngOnInit(): void {

    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes) {
            if (changes.inject.previousValue !== changes.inject.currentValue) {
                // this.ngOnInit();
                this.recoverChartColors(changes);
            }
        }
    }

    chartClicked(e: any): void {
        if (e.active.length > 0) {
            const chart = e.active[0]._chart;
            const activePoints = chart.getElementAtEvent(e.event);
            if (activePoints.length > 0) {
                // get the internal index of slice in pie chart
                const clickedElementIndex = activePoints[0]._index;
                const label = chart.data.labels[clickedElementIndex];
                // get value by index
                const value = chart.data.datasets[0].data[clickedElementIndex];
                // get color by index
                let background;
                if (this.inject.chartType === 'doughnut') {
                    background = chart.data.datasets[0].backgroundColor[clickedElementIndex];
                } else {
                    background = chart.data.datasets[0].backgroundColor;
                }
                console.log(clickedElementIndex, label, value, background);
            }
        }
    }

    chartHovered({ event, active }: { event: MouseEvent, active: {}[] }): void {
        //console.log(event, active);
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

    recoverChartColors(changes: any) {
        if (this.inject.chartColors) {
            if (changes.inject.currentValue.chartType === 'doughnut') {
                if (changes.inject.previousValue === undefined) {
                    if (changes.inject.currentValue.chartColors[0].pointBackgroundColor !== undefined) {
                        this.inject.chartColors = EdaChartComponent.generatePiecolors();
                    } else {
                        const SIZE = this.inject.chartColors[0].backgroundColor.length;
                        const colors = EdaChartComponent.generatePiecolors();
                        for (let i = SIZE; i < this.inject.chartData.length; i++) {
                            this.inject.chartColors[0].backgroundColor.push(colors[0].backgroundColor[i]);
                        }
                    }
                } else if (changes.inject.previousValue.chartType === 'doughnut') {
                    const SIZE = this.inject.chartColors[0].backgroundColor.length;
                    const colors = EdaChartComponent.generatePiecolors();
                    for (let i = SIZE; i < this.inject.chartData.length; i++) {
                        this.inject.chartColors[0].backgroundColor.push(colors[0].backgroundColor[i]);
                    }
                } else {
                    this.inject.chartColors = EdaChartComponent.generatePiecolors();
                }
            } else if (['line', 'bar'].includes(changes.inject.currentValue.chartType)) {
                if (changes.inject.previousValue === undefined) {

                } else if (['line', 'bar'].includes(changes.inject.previousValue.chartType)) {
                    this.inject.chartColors = changes.inject.previousValue.chartColors;
                }
            }

        } else if (changes.inject.currentValue.chartType === 'doughnut') {
            this.inject.chartColors = EdaChartComponent.generatePiecolors();

        } else {
            this.inject.chartColors = EdaChartComponent.generateChartColors();
        }

    }

    // getColors(label: string) {
    //   if ( this.inject.chartDataset ) {
    //     return this.inject.chartDataset.find(chart => chart.label === label).backgroundColor;
    //   }
    //   return '#505aff';
    // }

}
