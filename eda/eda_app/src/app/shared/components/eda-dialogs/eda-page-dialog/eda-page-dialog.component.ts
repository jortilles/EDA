import {Component, Input, OnInit} from '@angular/core';
import { EdaPageDialog } from './eda-page-dialog';

@Component({
    selector: 'eda-page-dialog',
    templateUrl: 'eda-page-dialog.component.html',
    styles: []
})
export class EdaPageDialogComponent implements OnInit {
    @Input() inject: EdaPageDialog;

    public newText: string;
    public clicked: boolean = false;

    constructor() {
    }

    ngOnInit(): void {  
        if(this.inject.title== ''){
            this.newText = '?';
        }else{
            this.newText = this.inject.title; 
        }
    }

    setTitle() {
        this.clicked = true;
    }

    getTitle() {
        if( this.newText != '?' && this.newText.length  > 0  ){
            return this.newText;
        }else {
            this.newText = '?';
            return  '';
        }
        
    }

}
