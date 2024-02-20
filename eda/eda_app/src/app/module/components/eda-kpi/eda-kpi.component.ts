import { Component, OnInit, Input, EventEmitter, Output, ViewChild, ElementRef, AfterViewInit} from '@angular/core';
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
    @ViewChild('sufixContainer')
    sufixContainer: ElementRef;
    sufixClick: boolean = false;
    color : string ;
    defaultColor = '#67757c';
    warningColor =  '#ff8100';
    containerHeight: number = 20;
    containerWidth: number = 20;

    constructor() { }

    ngOnInit() {
        registerLocaleData( es );
        try{
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
        }catch(e){
            console.log('No alert limits defined (alertLimits)');
            console.log(e);
        }
    }

    setSufix(): void {
        this.sufixClick = !this.sufixClick;
        this.onNotify.emit({sufix : this.inject.sufix})
    }

    getStyle():any{
        return { 'font-weight': 'bold','font-size': this.getFontSize(), display: 'flex','justify-content':'center',color:this.color}
    }
   
    /**
     * This function returns a string with the given font size (in px) based on the panel width and height 
     * @returns {string}
    */
    getFontSize():string{
        let resultSize:number = 1;
        resultSize = this.containerHeight/2;
        
        let textLongitude = (this.inject.value + this.inject.sufix).length;
        if(this.inject.sufix.length > 3){
            // Provoco saltos de linea en sufijos largos
            textLongitude = this.inject.value.toString().length
        }

        let textWidth = textLongitude * resultSize;
        
        if (textWidth > this.containerWidth) resultSize = ( this.containerWidth / textLongitude ) * 1.1 ;
    
        if (resultSize > this.containerHeight) resultSize = this.containerHeight;
        
        if (textLongitude * resultSize > this.containerWidth * 1.2) resultSize = resultSize / 1.5;
        
        if(this.inject.sufix.length > 3 &&  
            resultSize * 4 > this.containerHeight  &&
            textWidth >  this.containerWidth  ) resultSize = resultSize / 1.8;
        
        return resultSize.toFixed().toString() +'px';
    }
    
     
    
    

    ngAfterViewInit() {
        const widthKpiContainer = this.kpiContainer.nativeElement.offsetWidth;
        
        const heightKpiContainer = this.kpiContainer.nativeElement.offsetHeight;
        
        const sufixContainerReference = this.sufixContainer.nativeElement;
        
        if( widthKpiContainer > 0 ){
            this.containerHeight = heightKpiContainer  ;
            this.containerWidth = widthKpiContainer  ;
        }
        //Se pone en automático el ajustado del margen del texto
        sufixContainerReference.style.margin = "auto"

      }
      



}
