import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-info-page',
  templateUrl: 'about-eda.page.html',
  standalone: true,
  imports: [CommonModule],
  styles: []
})
export class AboutEdaPage {
  private _sanitizer = inject(DomSanitizer);
  // Estado para las tabs
  activeTab: 'datamodel' | 'report' = 'datamodel';

  public readonly datamodel: string = "https://www.youtube.com/embed/Px709s0ftiI";
  public readonly report: string = "https://www.youtube.com/embed/RFznLe9kxHU";
  public readonly edaliticsPlans: string = "https://www.youtube.com/embed/y5TC9MTvTmk";

  public reportSafe: SafeResourceUrl;
  public datamodelSafe: SafeResourceUrl;
  public edaliticsPlansSafe: SafeUrl;

  constructor() {
    this.reportSafe = this._sanitizer.bypassSecurityTrustResourceUrl(this.report);
    this.datamodelSafe = this._sanitizer.bypassSecurityTrustResourceUrl(this.datamodel);
    this.edaliticsPlansSafe = this._sanitizer.bypassSecurityTrustResourceUrl(this.edaliticsPlans);

  }
}