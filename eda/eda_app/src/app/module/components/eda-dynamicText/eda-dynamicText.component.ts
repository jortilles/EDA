import { Component, OnInit, Input, EventEmitter, Output, ViewChild, ElementRef} from '@angular/core';
import { EdadynamicText } from './eda-dynamicText';
import { dynamicTextDialogComponent } from './../eda-panels/eda-blank-panel/dynamicText-dialog/dynamicText-dialog.component';

@Component({
    selector: 'eda-dynamicText',
    templateUrl: './eda-dynamicText.component.html'
})

export class EdadynamicTextComponent implements OnInit {
    @Input() inject: EdadynamicText;
    @Input() color: dynamicTextDialogComponent;
    @Output() onNotify: EventEmitter<any> = new EventEmitter();
    @ViewChild('dynamicTextContainer')
    dynamicTextContainer: ElementRef;

 
    containerHeight: number = 20;
    containerWidth: number = 20;

    constructor() { }

    ngOnInit() {
      
    }

    getStyle():any{
        let color;
        try{
            if(this.inject.color["color"]!==undefined){
                color = this.inject.color["color"];
            }else {   
                color = this.inject.color;
            }
        }catch( e ){
            console.log("error getting color for dynamic text component");
            console.log(e);
            console.log(this.inject);
            color =null;
        }
        return {'font-weight': 'bold',  'font-size': this.getFontSize()  +'px' , display: 'inline','color': color}
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
        let strlen =  this.inject.value.toString().length;
        if( strlen * result > this.containerWidth*1.5 ){
            result = result / 1.5;
        }
        // Ok.... we are done...
        return result.toFixed().toString();


    }




    ngAfterViewInit() {
        const width = this.dynamicTextContainer.nativeElement.offsetWidth;
        const height = this.dynamicTextContainer.nativeElement.offsetHeight;
        
        if( width > 0 ){
            this.containerHeight = height  ;
            this.containerWidth = width  ;
        }
      }




}
