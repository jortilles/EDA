import { Component, OnInit, Input } from '@angular/core';
import { EdaChart } from './eda-chart';
import { Color } from 'ng2-charts';

@Component({
  selector: 'eda-chart',
  templateUrl: './eda-chart.component.html',
  styleUrls: []
})

export class EdaChartComponent implements OnInit {
  @Input() inject: EdaChart;

  public lineChartColors: Color[] = [
    { // main
      backgroundColor: 'rgba(53,115,136,0.2)',
      borderColor: 'rgba(53,115,136,1)',
      pointBackgroundColor: 'rgba(53,115,136,1)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(53,115,136,0.8)'
    },
    { // dark grey
      backgroundColor: 'rgba(42,126,104,0.2)',
      borderColor: 'rgba(42,126,104,1)',
      pointBackgroundColor: 'rgba(42,126,104,1)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(42,126,104,1)'
    },
    { // red
      backgroundColor: 'rgba(23,90,140,0.3)',
      borderColor: 'rgba(23,90,140,1)',
      pointBackgroundColor: 'rgba(23,90,140,1)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(23,90,140,0.8)'
    },
    { // dark grey
      backgroundColor: 'rgba(153, 81, 146,0.2)',
      borderColor: 'rgba(153, 81, 146,1)',
      pointBackgroundColor: 'rgba(153, 81, 146,1)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(153, 81, 146,1)'
    },
  ];

  public barChartColors: Color[] = [
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

  constructor() { }

  ngOnInit() {
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
        if (this.inject.chartType === 'pie') {
          background = chart.data.datasets[0].backgroundColor[clickedElementIndex];
        } else {
          background = chart.data.datasets[0].backgroundColor;
        }
        console.log(clickedElementIndex, label, value, background);
      }
    }
  }

  chartHovered({ event, active }: { event: MouseEvent, active: {}[] }): void {
    // console.log(event, active);
  }

  // getColors(label: string) {
  //   if ( this.inject.chartDataset ) {
  //     return this.inject.chartDataset.find(chart => chart.label === label).backgroundColor;
  //   }
  //   return '#505aff';
  // }

}
