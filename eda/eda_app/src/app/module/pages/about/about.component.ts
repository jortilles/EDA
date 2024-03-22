import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';


@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})

//https://youtu.be/y5TC9MTvTmk

export class AboutComponent implements OnInit {
  public readonly datamodel:string = "https://www.youtube.com/embed/Px709s0ftiI";
  public readonly report:string = "https://www.youtube.com/embed/RFznLe9kxHU";
  public readonly edaliticsPlans:string = "https://www.youtube.com/embed/y5TC9MTvTmk";
  public reportSafe:SafeResourceUrl;
  public datamodelSafe:SafeResourceUrl;
  public edaliticsPlansSafe:SafeUrl;
  constructor( private _sanitizer:DomSanitizer) {
    this.reportSafe = this._sanitizer.bypassSecurityTrustResourceUrl(this.report);
    this.datamodelSafe = this._sanitizer.bypassSecurityTrustResourceUrl(this.datamodel);
    this.edaliticsPlansSafe = this._sanitizer.bypassSecurityTrustResourceUrl(this.edaliticsPlans);

   }

  ngOnInit(): void {
  }

}
