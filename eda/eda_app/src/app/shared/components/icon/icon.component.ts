import { Component, inject, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconService } from '@eda/services/utils/icons.service';

@Component({
    selector: 'eda-icon',
    standalone: true,
    template: `
    <span 
      class="inline-block"
      [innerHTML]="sanitizedIcon"
      [class.h-5]="size === 'default'"
      [class.w-5]="size === 'default'"
      [class.h-4]="size === 'sm'"
      [class.w-4]="size === 'sm'"
      [class.h-6]="size === 'lg'"
      [class.w-6]="size === 'lg'"
    ></span>
  `,
   styles: [`
    :host {
      display: flex;
    }
  `],
  host: { 'class': 'eda-icon' }
})
export class IconComponent {
    @Input() name!: string;
    @Input() size: 'sm' | 'default' | 'lg' = 'lg';
    // @Input() class!: string;

    private iconService = inject(IconService);
    private sanitizer = inject(DomSanitizer);

    constructor() { }

    get sanitizedIcon(): SafeHtml {
        const icon = this.iconService.getIcon(this.name);
        return this.sanitizer.bypassSecurityTrustHtml(icon);
    }
}