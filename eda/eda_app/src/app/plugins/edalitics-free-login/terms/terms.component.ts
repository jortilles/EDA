import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

/** Edalitics Free terms and conditions, accepted on sign up (moved from get.edalitics.com). Translated through the app locale files (termsXxx ids). */
@Component({
    selector: 'app-free-terms',
    standalone: true,
    imports: [RouterModule],
    templateUrl: './terms.component.html',
    styleUrls: ['./terms.component.scss'],
})
export class TermsComponent {}
