import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent implements OnInit {

  // Estos valores son solo ejemplos. Debes reemplazarlos con datos reales, posiblemente obtenidos desde un servicio.
  sinergiaDaVersion: string = '2.0.1';
  edaVersion: string = '1.4.0';
  lastSyncDate: string = '2023-11-16 15:00:00';

  constructor() { }

  ngOnInit(): void {
    // Aquí puedes cargar los datos reales, por ejemplo, desde un servicio.
  }

}