import { Component, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
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
      [class.h-8]="size === 'xl'"
      [class.w-8]="size === 'xl'"
      [class.h-10]="size === '2xl'"
      [class.w-10]="size === '2xl'"
    ></span>
  `,
   styles: [`
    :host {
      display: flex;
    }
    /* [innerHTML] content bypasses Angular's view encapsulation, so plain :host svg
       wouldn't match it. Icons with no intrinsic square ratio (brand wordmarks like
       Vertica) would otherwise render at their own default size instead of filling
       the span the size inputs above size. */
    :host ::ng-deep svg {
      width: 100%;
      height: 100%;
      display: block;
    }
  `],
  host: { 'class': 'eda-icon' }
})
export class IconComponent implements OnChanges {
    @Input() name!: string;
    @Input() size: 'sm' | 'default' | 'lg' | 'xl' | '2xl' = 'lg';
    // @Input() class!: string;

    private iconService = inject(IconService);
    private sanitizer = inject(DomSanitizer);

    // Computed once per `name` change (not a getter) so [innerHTML] doesn't get a new
    // SafeHtml instance on every change-detection run: that was rebuilding the icon's
    // SVG DOM on every hover/mousemove inside the dropdown, which could swallow a click
    // landing mid-rebuild (mousedown/mouseup hitting different DOM nodes) until retried.
    sanitizedIcon: SafeHtml = '';

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['name']) {
            const icon = this.iconService.getIcon(this.name);
            this.sanitizedIcon = this.sanitizer.bypassSecurityTrustHtml(icon);
        }
    }
}