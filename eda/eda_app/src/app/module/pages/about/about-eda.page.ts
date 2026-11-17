import { Component } from '@angular/core';

import { version } from '../../../../../package.json';
import { GettingStartedComponent } from '@eda/shared/components/getting-started/getting-started.component';

@Component({
  selector: 'app-info-page',
  templateUrl: 'about-eda.page.html',
  standalone: true,
  imports: [GettingStartedComponent],
  styles: []
})
export class AboutEdaPage {
  public readonly version: string = version;
}