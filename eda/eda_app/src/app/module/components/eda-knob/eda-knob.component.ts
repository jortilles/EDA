
import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from "@angular/core";
import { EdaKnob } from "./edaKnob";

@Component({
  selector: 'eda-knob',
  templateUrl: './eda-knob.component.html',
  styleUrls: ['./eda-knob.component.css'],
})

export class EdaKnobComponent implements OnInit, AfterViewInit {

  @Input() inject: EdaKnob;
  @ViewChild('parentDiv', { static: false }) elementView: ElementRef;

  size: number = 100;
  color: string;
  limits: Array<number>;
  value: number;
  class: string;

  constructor() { }

  ngOnInit(): void {

    this.color = this.inject.color ? this.inject.color : '#409265';
    this.value = this.inject.data.values[0][0];
    this.limits = this.getLimits();
    this.class = this.value > 999999 ? 'p-knob-text-small' : this.value < 1000 ? 'p-knob-text-large' : 'p-knob-text';

  }
  ngAfterViewInit(): void {
     let val = this.elementView.nativeElement.clientWidth < 300 ? this.elementView.nativeElement.clientWidth /1 : 300;
    setTimeout(_ => { this.size =  val }, 0)
  }

  public getLimits() {

    let limits = [];

    if (this.inject.dataDescription.numericColumns.length === 2) {

      limits = [0, this.inject.data.values[0][1]];

    } else {

      if (this.inject.limits) {
        limits = this.inject.limits;
      }
      else {

        let n = parseInt(this.inject.data.values[0][0]);
        let count = 1;

        while (n > 0) {
          n = Math.floor(n / 10);
          count *= 10;
        }

       limits = [0, count]

      }

    }
    if(limits[1] < this.value) limits[1] = this.value;
    return limits;

  }

}