import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { CustomHTMLService } from '@eda/services/api/customHTML.service';
import { DashboardService } from '@eda/services/api/dashboard.service';
import { AlertService } from '@eda/services/service.index';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-customized-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, EdaDialog2Component],
  templateUrl: './customized-dashboard.component.html',
})
export class CustomizedDashboardComponent implements OnInit, OnDestroy {
  private alertService = inject(AlertService);
  private dashboardService = inject(DashboardService);
  public canEdit: boolean = false;
  public showEditDialog: boolean = false;
  public haveUnsavedChanges: boolean = false;
  public sidebarOpen: boolean = true;
  public sidebarLocked: boolean = false;
  public isPinned: boolean = true;
  private _closeTimer: ReturnType<typeof setTimeout> | null = null;

  public sidebarHtml: string = '';
  public editingHtml: string = '';
  public safeEditingHtml: SafeHtml = '';
  public safeSidebarHtml: SafeHtml = '';

  public sidebarBgColor: string = '#96adb5';
  public previewBgColor: string = '#96adb5';

  public publicDashboards: any[] = [];
  public selectedInitialDashboardId: string = '';
  public editingInitialDashboardId: string = '';
  public iframeSrc: string | SafeResourceUrl = '';

  constructor(private sanitizer: DomSanitizer, private customHTMLService: CustomHTMLService) {}

  ngOnDestroy(): void {
    if (this._closeTimer) clearTimeout(this._closeTimer);
  }

  openSidebar(): void {
    if (this._closeTimer) { clearTimeout(this._closeTimer); this._closeTimer = null; }
    this.sidebarOpen = true;
  }

  closeSidebar(): void {
    if (this.sidebarLocked || this.isPinned) return;
    this._closeTimer = setTimeout(() => { this.sidebarOpen = false; this._closeTimer = null; }, 200);
  }

  togglePin(): void {
    this.isPinned = !this.isPinned;
    if (this.isPinned) this.sidebarOpen = true;
  }

  async ngOnInit(): Promise<void> {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user?.role?.includes('135792467811111111111110') ?? false;
    const isDataSourceCreator = localStorage.getItem('isDataSourceCreator') === 'true';
    this.canEdit = isAdmin || isDataSourceCreator;

    try {
      const { publics } = await lastValueFrom(this.dashboardService.getDashboards());
      this.publicDashboards = (publics || []).sort((a: any, b: any) =>
        (a.config?.title || '').localeCompare(b.config?.title || '')
      );
    } catch (err) {
      console.error('[CustomizedDashboard] Error loading public dashboards:', err);
    }

    this.customHTMLService.getByKey('portalConfig').subscribe({
      next: ({ value }) => {
        const config = this._parsePortalConfig(value);
        this.sidebarHtml = config.html;
        this.selectedInitialDashboardId = config.initialDashboardId;
        this._applySidebarHtml(this.sidebarHtml);
        this._updateIframeSrc();
      },
      error: () => {
        // Fallback: intentar recuperar la clave legacy 'customHTML'
        this.customHTMLService.getByKey('customHTML').subscribe({
          next: ({ value }) => {
            this.sidebarHtml = value || this._buildSidebarHtml();
            this._applySidebarHtml(this.sidebarHtml);
            this._updateIframeSrc();
          },
          error: () => {
            this.sidebarHtml = this._buildSidebarHtml();
            this._applySidebarHtml(this.sidebarHtml);
            this._updateIframeSrc();
          }
        });
      }
    });
  }

  saveSidebar(): void {
    const config = JSON.stringify({ html: this.sidebarHtml, initialDashboardId: this.selectedInitialDashboardId });
    this.customHTMLService.upsert('portalConfig', config).subscribe({
      next: () => this.haveUnsavedChanges = false,
      error: (err) => console.error('Error saving portal config', err)
    });
    this.alertService.addSuccess($localize`:@@customHtmlSaved:HTML personalizado guardado correctamente.`);
  }

  private _parsePortalConfig(value: string): { html: string; initialDashboardId: string } {
    try {
      const parsed = JSON.parse(value);
      return {
        html: parsed.html || this._buildSidebarHtml(),
        initialDashboardId: parsed.initialDashboardId || ''
      };
    } catch {
      // Compatibilidad con la clave antigua 'customHTML' que guardaba HTML plano, eliminar a posterior
      return { html: value || this._buildSidebarHtml(), initialDashboardId: '' };
    }
  }

  onDialogReset(): void {
    const original = this._buildSidebarHtml();
    this.editingHtml = original;
    this.safeEditingHtml = this.sanitizer.bypassSecurityTrustHtml(original);
    this.previewBgColor = this._extractBgColor(original);
    this.editingInitialDashboardId = this.selectedInitialDashboardId;
  }

  private _applySidebarHtml(html: string): void {
    this.safeSidebarHtml = this.sanitizer.bypassSecurityTrustHtml(html);
    this.sidebarBgColor = this._extractBgColor(html);
  }

  private _updateIframeSrc(): void {
    if (this.selectedInitialDashboardId) {
      const url = `#/public/${this.selectedInitialDashboardId}?panelMode=true`;
      this.iframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    } else {
      this.iframeSrc = '';
    }
  }

  openEditDialog(): void {
    this.editingHtml = this.sidebarHtml;
    this.safeEditingHtml = this.sanitizer.bypassSecurityTrustHtml(this.editingHtml);
    this.previewBgColor = this._extractBgColor(this.editingHtml);
    this.editingInitialDashboardId = this.selectedInitialDashboardId;
    this.showEditDialog = true;
    this.sidebarLocked = true;
  }

  onEditingHtmlChange(value: string): void {
    this.safeEditingHtml = this.sanitizer.bypassSecurityTrustHtml(value);
    this.previewBgColor = this._extractBgColor(value);
  }

  onDialogClose(): void {
    this.showEditDialog = false;
    this.editingHtml = '';
    this.sidebarLocked = false;
  }

  onDialogApply(): void {
    this.sidebarHtml = this.editingHtml;
    this._applySidebarHtml(this.sidebarHtml);

    if (this.editingInitialDashboardId !== this.selectedInitialDashboardId) {
      this.selectedInitialDashboardId = this.editingInitialDashboardId;
      this._updateIframeSrc();
    }

    this.haveUnsavedChanges = true;
    this.showEditDialog = false;
    this.editingHtml = '';
    this.sidebarLocked = false;
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
    return `<div class="flex flex-col h-full text-white" style="background-color: #96adb5">
      <div class="flex-1 overflow-auto px-4 py-4">
        <ul class="space-y-2">

          <li>
            <div class="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-white/10 transition">
              <span>📊</span>
              <span class="font-medium">Lorem ipsum</span>
            </div>
          </li>

          <li>
            <div class="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-white/10 transition">
              <span class="font-medium">Lorem ipsum</span>
            </div>
          </li>

          <li class="pl-6">
            <div class="block px-4 py-2 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 transition">
              Lorem ipsum
            </div>
          </li>
          <li class="pl-6">
            <div class="block px-4 py-2 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 transition">
              Lorem ipsum
            </div>
          </li>

        </ul>
        <div class="mt-6 p-4 bg-white/10 backdrop-blur-smshadow-sm">
          <p class="text-sm text-white/90 leading-relaxed mb-4">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi quis tellus et eros ultricies dignissim.
          </p>
          <p class="text-sm text-white/70 leading-relaxed">
            Maecenas metus mi, bibendum a orci eu, pellentesque imperdiet ex.
          </p>
        </div>
      </div>
    </div>`;
  }
}
