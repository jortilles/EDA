import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
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

    sufixClick: boolean = false;
    color : string ;
    defaultColor = '#67757c';
    warningColor =  '#ff8100';

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
        return {'font-weight': 'bold', display: 'inline', 'white-space': 'nowrap', color:this.color}
    }

}
