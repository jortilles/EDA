import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable()
export class SettingsService {

    settings: Settings = {
        temaUrl: 'assets/css/colors/default-dark.css',
        tema: 'default-dark'
    };

    constructor(@Inject(DOCUMENT) private _document, ) {
        this.loadingSettings();
    }

    saveSettings() {
        localStorage.setItem('settings', JSON.stringify(this.settings));
    }

    loadingSettings() {
        if (localStorage.getItem('settings')) {
            this.settings = JSON.parse(localStorage.getItem('settings'));
            this.applyTheme(this.settings.tema);
        } else {
            this.applyTheme(this.settings.tema);
        }
    }

    applyTheme(tema: string) {
        const url = `assets/css/colors/${tema}.css`;
        this._document.getElementById('tema').setAttribute('href', url);

        this.settings.tema = tema;
        this.settings.temaUrl = url;

        this.saveSettings();
    }

}

interface Settings {
    temaUrl: string;
    tema: string;
}
