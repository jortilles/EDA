import { Component, OnInit, Input, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { EdaChart } from './eda-chart';
import { BaseChartDirective, Color } from 'ng2-charts';

@Component({
    selector: 'eda-chart',
    templateUrl: './eda-chart.component.html',
    styleUrls: []
})

export class EdaChartComponent implements OnInit {
    @ViewChild('edaChart', { static: false }) edaChart: BaseChartDirective;
    @Input() inject: EdaChart;

    public update: boolean;

    public static defaultChartColors: Color[] = EdaChartComponent.generateChartColors();

    public static defaultPieColors: Color[] = EdaChartComponent.generatePiecolors();

    public static generateChartColors(iterations?: number) {
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

    public static generatePiecolors() {

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
        // if(this.inject.chartType === 'barline'){

        // }
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
                if (this.inject.chartType === 'doughnut' || this.inject.chartType === 'polarArea') {
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

}
