import { Component, OnInit, Input, EventEmitter, Output, ViewChild, ElementRef } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { EdaKpi } from './eda-kpi';
import es from '@angular/common/locales/es';

@Component({
    selector: 'eda-kpi',
    templateUrl: './eda-kpi.component.html'
})

export class EdaKpiComponent implements OnInit {
    @Input() inject: EdaKpi;
    @Output() onNotify: EventEmitter<any> = new EventEmitter();
    @ViewChild('kpiContainer')
    kpiContainer: ElementRef;

    sufixClick: boolean = false;
    color : string ;
    defaultColor = '#67757c';
    warningColor =  '#ff8100';
    containerHeight: number = 20;
    containerWidth: number = 20;

    constructor() { }

    ngOnInit() {
        registerLocaleData( es );
        if(this.inject.alertLimits.length > 0){
            this.inject.alertLimits.forEach(alert => {
                const operand = alert.operand, warningColor = alert.color;
                const value1 = this.inject.value, value2 = alert.value;
                if(this.color !== this.defaultColor) this.defaultColor = this.color;
                switch(operand){
                    case '<': this.color = value1 < value2  ?  warningColor  : this.defaultColor; break;
                    case '=': this.color = value1 === value2 ?  warningColor : this.defaultColor; break;
                    case '>': this.color = value1 > value2   ?  warningColor : this.defaultColor; break;
                    default : this.color = this.defaultColor;
                }
            });
        }
    }

    setSufix(): void {
        this.sufixClick = !this.sufixClick;
        this.onNotify.emit({sufix : this.inject.sufix})
    }

    getStyle():any{
        return {'font-weight': 'bold',  'font-size': this.getFontSize()  +'px' , display: 'inline', 'white-space': 'nowrap', color:this.color}
    }

    getFontSize():string{
        let result:number = 1;
        //  By default is the height / 2
        result = this.containerHeight/2;
        // But maybe the widht is no enought.... lets check...
        if( result*4 > this.containerWidth){
            result =  this.containerWidth/4;
        }
        // But maybe the string lenght is too long... lets check 
        let strlen =  (this.inject.value + this.inject.sufix).length;
        if( strlen * result > this.containerWidth*1.5 ){
            result = result / 1.8;
        }
        // Ok.... we are done...

        return result.toFixed().toString();

    }

    ngAfterViewInit() {
        const width = this.kpiContainer.nativeElement.offsetWidth;
        const height = this.kpiContainer.nativeElement.offsetHeight;
       

        if( width > 0 ){
            this.containerHeight = height  ;
            this.containerWidth = width  ;
        }


      }
      



}
