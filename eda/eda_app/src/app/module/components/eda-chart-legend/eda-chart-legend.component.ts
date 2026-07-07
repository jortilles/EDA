import { Component, EventEmitter, HostListener, Input, OnChanges, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface EdaLegendItem {
  label: string;
  color: string;
  hidden: boolean;
}

@Component({
  standalone: true,
  selector: 'eda-chart-legend',
  templateUrl: './eda-chart-legend.component.html',
  styleUrls: ['./eda-chart-legend.component.css'],
  imports: [CommonModule]
})
export class EdaChartLegendComponent implements OnInit, OnChanges {
  @Input() items: EdaLegendItem[] = [];
  @Output() toggle: EventEmitter<number> = new EventEmitter<number>();

  fontSize = '14px';
  boxSize = '10px';

  ngOnInit(): void {
    this.updateSizing();
  }

  ngOnChanges(): void {
    this.updateSizing();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateSizing();
  }

  private updateSizing(): void {
    let variador = 0;
    if (window.innerWidth < 1500) variador = -2;
    if (window.innerWidth < 1100) variador = -4;
    const manySeries = this.items.length > 10;
    // Chart.js hardcodes the legend label font to 14px regardless of manySeries/variador - only boxWidth/padding scale.
    this.fontSize = '14px';
    this.boxSize = `${(manySeries ? 8 : 10) + variador}px`;
  }

  onToggle(index: number): void {
    this.toggle.emit(index);
  }
}
