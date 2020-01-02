import { Component, OnInit } from '@angular/core';
import { SettingsService } from '@eda_services/service.index';

@Component({
    selector: 'app-account-settings',
    templateUrl: './account-settings.component.html',
    styles: []
})
export class AccountSettingsComponent implements OnInit {

    constructor( public _settingsService: SettingsService ) { }

    ngOnInit() {
        this.loadCheck();
    }

    canviarColor(tema: string, link: any) {

        this.applyCheck(link);

        this._settingsService.applyTheme(tema);
    }

    applyCheck(link: any) {
        const selectores: any = document.getElementsByClassName('selector');
        for ( const ref of selectores ) {
            ref.classList.remove('working');
        }
        link.classList.add('working');
    }

    loadCheck() {
        const selectores: any = document.getElementsByClassName('selector');
        for ( let ref of selectores ) {
            if ( ref.getAttribute('data-theme') === this._settingsService.settings.tema ) {
                ref.classList.add('working');
                break;
            }
        }
    }



}
