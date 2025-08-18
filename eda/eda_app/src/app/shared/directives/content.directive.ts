// content-marker.directive.ts
import { Directive, ElementRef } from '@angular/core';

@Directive({
  selector: '[content]',
})
export class ContentMarkerDirective {
  constructor(public el: ElementRef) {}
}
