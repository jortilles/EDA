import {Component, Input, OnInit} from '@angular/core';
import { EdaPageDialog } from './eda-page-dialog';
import { FocusOnShowDirective } from '../../../directives/autofocus.directive';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';

@Component({
    selector: 'eda-page-dialog',
    templateUrl: 'eda-page-dialog.component.html',
    styles: [],
    standalone: true,
    imports: [DialogModule, FormsModule, InputTextModule, FocusOnShowDirective]
})
export class EdaPageDialogComponent implements OnInit {
    @Input() inject: EdaPageDialog;

    public newText: string;
    public clicked: boolean = false;

    constructor() {
    }

    ngOnInit(): void {  
        if(this.inject.title== ''){
            this.newText = '\uD83D\uDD89';
        }else{
            this.newText = this.inject.title; 
        }
    }

    setTitle() {
        this.clicked = true;
    }

    getTitle() {
        if( this.newText != '\uD83D\uDD89' && this.newText.length  > 0  ){
            return this.newText;
        }else {
            this.newText = '\uD83D\uDD89';
            return  '';
        }
        
    }

}
