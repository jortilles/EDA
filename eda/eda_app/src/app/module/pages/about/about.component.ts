import { Component, OnInit } from "@angular/core";
import { sinergiaConn } from "../../../../../../eda_api/config/sinergiacrm.config.js";
import { SdaVersion } from   "../../../../../../SdaVersion.js";

@Component({
  selector: "app-about",
  templateUrl: "./about.component.html",
  styleUrls: ["./about.component.css"]
})
export class AboutComponent implements OnInit {
  // Estos valores son solo ejemplos. Debes reemplazarlos con datos reales, posiblemente obtenidos desde un servicio.
  sinergiaDaVersion: string = "2.0.1";
  edaVersion: string = "1.4.0";
  lastSyncDate: string = "2023-11-16 15:00:00";
  lastSyncDateScriptVersion: string = "20231116150000";
  sinergiaCRMDatabaseName: string = "Undfind";

  constructor() {}

  ngOnInit(): void {
    this.sinergiaCRMDatabaseName = sinergiaConn.database;
    this.sinergiaDaVersion = SdaVersion;
  }




}
