import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';


@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})

export class AboutComponent implements OnInit {
  public readonly jortillesEdalitics:string = "https://www.youtube.com/embed/AP20LTsA0n8";
  public readonly espaiEmpresa:string = "https://www.youtube.com/embed/gYV-EQSv_qs";
  public readonly edaDocs:string = "https://edadoc.jortilles.com/#/";
  public readonly edaYouTubeChannel = "https://www.youtube.com/@jortilles6126";
  public espaiEmpresaSafe:SafeResourceUrl;
  public jortillesEdaliticsSafe:SafeResourceUrl;
  public edaDocsSafe:SafeUrl;
  public edaYouTubeChannelSafe:SafeUrl;
  constructor( private _sanitizer:DomSanitizer) {
    this.espaiEmpresaSafe = this._sanitizer.bypassSecurityTrustResourceUrl(this.espaiEmpresa);
    this.jortillesEdaliticsSafe = this._sanitizer.bypassSecurityTrustResourceUrl(this.jortillesEdalitics);
    this.edaDocsSafe = this._sanitizer.bypassSecurityTrustUrl(this.edaDocs);
    this.edaYouTubeChannelSafe = this._sanitizer.bypassSecurityTrustUrl(this.edaYouTubeChannel);

   }

  ngOnInit(): void {
  }

}
