import { Component, OnInit, Input, EventEmitter, Output, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import { EdadynamicText } from './eda-dynamicText';
import { dynamicTextDialogComponent } from './../eda-panels/eda-blank-panel/dynamicText-dialog/dynamicText-dialog.component';
import { StyleProviderService } from '@eda/services/service.index';

import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';
@Component({
    standalone: true,
    selector: 'eda-dynamicText',
    schemas: [CUSTOM_ELEMENTS_SCHEMA],  
    templateUrl: './eda-dynamicText.component.html',
    imports: [FormsModule, CommonModule]
})

export class EdadynamicTextComponent implements OnInit {
    @Input() inject: EdadynamicText;
    @Input() color: dynamicTextDialogComponent;
    @Output() onNotify: EventEmitter<any> = new EventEmitter();
    @ViewChild('dynamicTextContainer', { static: false }) dynamicTextContainer!: ElementRef;

    containerHeight: number = 20;
    containerWidth: number = 20;

    constructor(private styleProviderService : StyleProviderService) { }

    ngOnInit() {}

    getStyle(): any {
        let color = this.inject?.color;
        
        if (this.styleProviderService.loadingFromPalette) {
            color = this.styleProviderService.panelFontColor.source['_value'];
            this.inject.color = this.styleProviderService.panelFontColor.source['_value'];
        }
        const fontSize = this.getFontSize();
        color = this.findColor(color);
        
        return {
            'font-weight': 'bold',
            'font-size': fontSize,
            'color': color,
        };
    }

    findColor(color) {
        while (color) {
            if (typeof color === "string") {
                return color;
            }
            if (color && typeof color === "object" && "color" in color) {
                color = color.color;
            } else {
                break;
            }
        }
        return null; 
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
