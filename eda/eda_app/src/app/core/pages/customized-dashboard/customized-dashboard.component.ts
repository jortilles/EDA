import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { CustomHTMLService } from '@eda/services/api/customHTML.service';

@Component({
  selector: 'app-customized-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, EdaDialog2Component],
  templateUrl: './customized-dashboard.component.html',
})
export class CustomizedDashboardComponent implements OnInit {
  public isAdmin: boolean = false;
  public showEditDialog: boolean = false;
  public haveUnsavedChanges: boolean = false;

  public sidebarHtml: string = '';
  public editingHtml: string = '';
  public safeEditingHtml: SafeHtml = '';
  public safeSidebarHtml: SafeHtml = '';

  public sidebarBgColor: string = '#96adb5';
  public previewBgColor: string = '#96adb5';

  constructor(private sanitizer: DomSanitizer, private customHTMLService: CustomHTMLService) {}

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.isAdmin = user?.role?.includes('135792467811111111111110') ?? false;
    this.customHTMLService.getByKey('customHTML').subscribe({
      next: ({ value }) => {
        console.log('[CustomizedDashboard] HTML cargado desde BD:', value);
        this.sidebarHtml = value;
        this._applySidebarHtml(this.sidebarHtml);
      },
      error: (err) => {
        console.log('[CustomizedDashboard] No hay HTML guardado, usando el por defecto. Error:', err);
        this.sidebarHtml = this._buildSidebarHtml();
        this._applySidebarHtml(this.sidebarHtml);
      }
    });
  }

  changeSrc(href: string): void {
    const iframe = document.getElementById('showDashboard') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = href + '?panelMode=true&refresh=' + Date.now();
    }
  }

  saveSidebar(): void {
    this.customHTMLService.upsert('customHTML', this.sidebarHtml).subscribe({
      next: () => this.haveUnsavedChanges = false,
      error: (err) => console.error('Error saving sidebar', err)
    });
  }

  onDialogReset(): void {
    const original = this._buildSidebarHtml();
    this.editingHtml = original;
    this.safeEditingHtml = this.sanitizer.bypassSecurityTrustHtml(original);
    this.previewBgColor = this._extractBgColor(original);
  }

  private _applySidebarHtml(html: string): void {
    this.safeSidebarHtml = this.sanitizer.bypassSecurityTrustHtml(html);
    this.sidebarBgColor = this._extractBgColor(html);
  }

  openEditDialog(): void {
    this.editingHtml = this.sidebarHtml;
    this.safeEditingHtml = this.sanitizer.bypassSecurityTrustHtml(this.editingHtml);
    this.previewBgColor = this._extractBgColor(this.editingHtml);
    this.showEditDialog = true;
  }


  onEditingHtmlChange(value: string): void {
    this.safeEditingHtml = this.sanitizer.bypassSecurityTrustHtml(value);
    this.previewBgColor = this._extractBgColor(value);
  }

  onDialogClose(): void {
    this.showEditDialog = false;
    this.editingHtml = '';
  }

  onDialogApply(): void {
    this.sidebarHtml = this.editingHtml;
    this._applySidebarHtml(this.sidebarHtml);
    this.haveUnsavedChanges = true;
    this.showEditDialog = false;
    this.editingHtml = '';
  }

  private _extractBgColor(html: string): string {
    const inlineMatch = html.match(/background-color\s*:\s*([^;"']+)/i);
    if (inlineMatch) return inlineMatch[1].trim();

    const tailwindMatch = html.match(/bg-\[([^\]]+)\]/);
    if (tailwindMatch) return tailwindMatch[1];

    return '#96adb5';
  }

  // RAW HTML base, modificar aquí
  private _buildSidebarHtml(): string {
    return `<div class="flex flex-col pt-4 gap-4 h-full" style="background-color: #96adb5">
  <div class="p-2 overflow-auto flex-1">
    <ul class="space-y-2 pl-[10%]">
      <li class="p-2 pt-0 pb-0 text-white font-bold">
        <div class="flex items-center">
          <span class="mr-1">📊</span>
          <a class="btn" href="#">Despeses</a>
        </div>
      </li>
      <li class="p-2 pt-0 pb-0 text-white font-bold">
        <div class="flex items-center">
          <span class="mr-1">🚓</span>
          <a class="btn" href="#">Actuacions Policials</a>
        </div>
      </li>
      <li class="p-2 pt-0 pb-0 text-white font-bold">
        <a class="btn ml-[10%]">Desplaçaments</a>
      </li>
      <li class="p-2 pt-0 pb-0 text-white font-bold">
        <a class="btn ml-[10%]">Parc de vehicles</a>
      </li>
      <li class="p-2 pt-0 pb-0 text-white font-bold">
        <div class="flex items-center">
          <span class="mr-1">🌿</span>
          <a class="btn" href="#">Pressupost</a>
        </div>
      </li>
      <li class="p-2 pt-0 pb-0 text-white font-bold">
        <a class="btn ml-[10%]">Energia i consum</a>
      </li>
      <li class="p-2 pt-0 pb-0 text-white font-bold">
        <a class="btn ml-[10%]">Externalitats</a>
      </li>
      <li class="p-2 pt-0 pb-0 text-white font-bold">
        <div class="flex items-center">
          <span class="mr-1">⚠️</span>
          <a class="btn" href="#">Seguretat</a>
        </div>
      </li>
      <li class="p-2 pt-0 pb-0 text-white font-bold">
        <a class="btn ml-[10%]">Delinqüència</a>
      </li>
      <li class="p-2 pt-0 pb-0 text-white font-bold">
        <a class="btn ml-[10%]">Viari</a>
      </li>
      <li class="p-2 pt-0 pb-0 text-white font-bold">
        <div class="flex items-center">
          <span class="mr-1">☂️</span>
          <a class="btn" href="#">Turisme</a>
        </div>
      </li>
      <li class="p-2 pt-0 pb-0 text-white font-bold">
        <a class="btn ml-[10%]">Visitants</a>
      </li>
      <li class="p-2 pt-0 pb-0 text-white font-bold">
        <a class="btn ml-[10%]">Hosteleria</a>
      </li>
      <li class="p-2 pt-0 pb-0 text-white font-bold">
        <div class="flex items-center">
          <span class="mr-1">⚙️</span>
          <a class="btn" href="#">Configuració</a>
        </div>
      </li>
    </ul>
  </div>
</div>`;
  }
}
