import { Component, OnInit, Input, EventEmitter, Output, ViewChild, ElementRef} from '@angular/core';
import { EdadynamicText } from './eda-dynamicText';
import { dynamicTextDialogComponent } from './../eda-panels/eda-blank-panel/dynamicText-dialog/dynamicText-dialog.component';
import { StyleProviderService } from '@eda/services/service.index';

@Component({
    selector: 'eda-dynamicText',
    templateUrl: './eda-dynamicText.component.html'
})

export class EdadynamicTextComponent implements OnInit {
    @Input() inject: EdadynamicText;
    @Input() color: dynamicTextDialogComponent;
    @Output() onNotify: EventEmitter<any> = new EventEmitter();
    @ViewChild('dynamicTextContainer', { static: false }) dynamicTextContainer!: ElementRef;


 
    containerHeight: number = 20;
    containerWidth: number = 20;

    constructor(private styleProviderService : StyleProviderService) { }

    ngOnInit() {
      
    }

getStyle(): any {
    let color = this.inject?.color;
    if (this.styleProviderService.loadingFromPalette) {
        color = this.styleProviderService.ActualChartPalette['paleta'][0];
    }

    const fontSize = this.getFontSize();

    return {
        'font-weight': 'bold',
        'font-size': fontSize,
        'color': color,
    };
}



getFontSize(): string {
    let result = 1;

    if (!this.dynamicTextContainer) {
        return '1px';
    }

    const realContainer = this.dynamicTextContainer.nativeElement
        ?.parentElement
        ?.parentElement
        ?.parentElement;

    const containerWidth = realContainer.offsetWidth;
    const containerHeight = realContainer.offsetHeight;

    this.containerWidth = containerWidth;
    this.containerHeight = containerHeight;

    result = containerHeight / 2;

    if (result * 4 > containerWidth) {
        result = containerWidth / 4;
    }

    const text = (this.inject?.value ?? '').toString();
    const strlen = text.length || 1;

    if (strlen * result > containerWidth * 1.5) {
        result = result / 1.5;
    }

    result = Math.max(result, 10)-5;

    return `${result.toFixed()}px`;
}






    ngAfterViewInit() {
        const width = this.dynamicTextContainer.nativeElement.offsetWidth;
        const height = this.dynamicTextContainer.nativeElement.offsetHeight;
        
        if( width > 0 ){
            this.containerHeight = height  ;
            this.containerWidth = width  ;
        }
          this.getFontSize();

      }




}
