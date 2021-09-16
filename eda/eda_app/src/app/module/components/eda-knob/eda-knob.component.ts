
import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from "@angular/core";
import { EdaKnob } from "./edaKnob";

@Component({
  selector: 'eda-knob',
  templateUrl: './eda-knob.component.html',
  styleUrls: ['./eda-knob.component.css'],
})

export class EdaKnobComponent implements OnInit, AfterViewInit {

  @Input() inject: EdaKnob;
  @ViewChild('parentDiv')
  parentDiv: ElementRef;

  size: number = 100;
  color: string;
  limits: Array<number>;
  value: number;
  comprareValue: number;
  class: string;

  constructor() { }

  ngOnInit(): void {
    this.color = this.inject.color ? this.inject.color : "#024873";
    this.value = this.inject.data.values[0][0];
    this.limits = this.getLimits();
    this.comprareValue = this.inject.data.values[0][1] ? this.inject.data.values[0][1] : this.limits[1];
    this.class = this.value > 999999 ? 'p-knob-text-small' : this.value < 1000 ? 'p-knob-text-large' : 'p-knob-text';
  }

  ngAfterViewInit(): void {
    const w = this.parentDiv.nativeElement.offsetWidth;
    const h = this.parentDiv.nativeElement.offsetHeight;
    let val:number = 10;
    if( w>0 && h>0){
      if( w<=h){
        val = w;
      }else{
        val = h;
      }
      val = parseInt((val/1.2).toFixed());
    }
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