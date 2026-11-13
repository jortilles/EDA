import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { version } from '../../../../../package.json';
import { GettingStartedComponent } from '@eda/shared/components/getting-started/getting-started.component';

@Component({
  selector: 'app-info-page',
  templateUrl: 'about-eda.page.html',
  standalone: true,
  imports: [CommonModule, GettingStartedComponent],
  styles: [`
    .tutorial-banner {
      border-color: var(--corporate-primary-light-alt);
      background-color: var(--corporate-primary-surface);
    }
    .tutorial-banner:hover {
      background-color: var(--corporate-primary-light);
    }
    .tutorial-banner-icon {
      color: var(--corporate-primary);
    }
    .tutorial-banner-cta {
      background-color: var(--corporate-primary);
    }
    .tutorial-banner:hover .tutorial-banner-cta {
      background-color: var(--corporate-primary-darkest);
    }
  `]
})
export class AboutEdaPage {
  public readonly version: string = version;
}