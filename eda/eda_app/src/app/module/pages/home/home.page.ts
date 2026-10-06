import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { Router } from '@angular/router';
import { lastValueFrom, fromEvent, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { UserService } from '@eda/services/api/user.service';
import { GroupService } from '@eda/services/api/group.service';
import { AlertService, DashboardService } from '@eda/services/service.index';
import { CreateDashboardService } from '@eda/services/utils/create-dashboard.service';
import Swal from 'sweetalert2';
import * as _ from 'lodash';
import { CommonModule } from '@angular/common';
import { EdaDatePickerComponent } from '@eda/shared/components/eda-date-picker/eda-date-picker.component';
import { EdaDatePickerConfig } from '@eda/shared/components/eda-date-picker/datePickerConfig';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { ChatbotComponent } from '@eda/components/chatbot/chatbot.component';
import { GettingStartedComponent } from '@eda/shared/components/getting-started/getting-started.component';
import { DragDropModule, CdkDragDrop, CdkDragMove } from '@angular/cdk/drag-drop';

type DragPayload =
  | { type: 'report'; report: any; fromColKey: string; fromTag: string | null }
  | { type: 'folder'; tag: string; fromColKey: string };

@Component({
  selector: 'app-v2-home-page',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet, IconComponent, CommonModule, EdaDatePickerComponent, DropdownModule, MultiSelectModule, ChatbotComponent, GettingStartedComponent, DragDropModule],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.css']
})
export class HomePage implements OnInit, OnDestroy {
  private createDashboardService = inject(CreateDashboardService);
  private dashboardService = inject(DashboardService);
  private alertService = inject(AlertService);
  private router = inject(Router);

  allDashboards: any[] = [];
  reportsLoaded = signal(false);
  publicReports: any[] = [];
  privateReports: any[] = [];
  roleReports: any[] = [];
  sharedReports: any[] = [];
  reportMap: any = { public: [], shared: [], private: [], group: [] };

  tags: any[] = [];
  selectedTags = signal<any>(JSON.parse(sessionStorage.getItem('activeTags') ? sessionStorage.getItem('activeTags') : '[]'));

  viewMode = signal<'folders' | 'flat'>('flat');
  expandedFolder = signal<{ tag: string; colKey: string } | null>(null);
  readonly allTagsValue = $localize`:@@AllTags:Todos`;
  readonly allTagsFlatValue = 'TodosFlat';
  readonly allTagsFlatLabel = $localize`:@@AllTagsFlat:Todo`;
  readonly allTagsGroupedLabel = $localize`:@@AllTagsGrouped:Todo agrupado`;

  isOpenTags = signal(false);
  searchTagTerm = signal('');

  public grups: Array<any> = [];
  public isObserver: boolean = true;

  showAdvancedFilter = signal(false);
  private outsideClickSub?: Subscription;
  private dashboardCreatedSub?: Subscription;
  searchQuery = '';
  advancedFilters = { author: '', datasource: '' };
  advancedTags: string[] = [];
  createdPickerConfig: EdaDatePickerConfig = { dateRange: [], range: null, filter: null };
  modifiedPickerConfig: EdaDatePickerConfig = { dateRange: [], range: null, filter: null };
  createdRange: Date[] = [];
  modifiedRange: Date[] = [];

  isEditing = false;
  editingReportId: string | null = null;
  editTitle: string = '';
  sortingType: string = sessionStorage.getItem('homeSorting') || 'name';
  readonly sortOptions = [
    { label: $localize`:@@name:Nombre`, value: 'name' },
    { label: $localize`:@@createdAt:Fecha (asc.)`, value: 'dateAsc' },
    { label: $localize`:@@createdAtDesc:Fecha (desc.)`, value: 'dateDesc' },
  ];

  isArray = Array.isArray;

  // ---- Drag & drop: dashboards/folders across visibility columns and tag folders ----
  private isCdkDragging = false;
  private currentHighlightEl: HTMLElement | null = null;
  private lastDragMoveCheck = 0;

  private readonly colKeyToVisible: { [key: string]: string } = {
    shared: 'open',
    public: 'common',
    group: 'group',
    private: 'private'
  };

  formatDate(value: string): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  public publicTitle: string = $localize`:@@tituloGrupoPublicos:PUBLICOS`;
  public commonTitle: string = $localize`:@@tituloGrupoComunes:COMUNES`;
  public groupTitle: string = $localize`:@@tituloGrupoMisGrupos:MIS GRUPOS`;
  public privateTitle: string = $localize`:@@tituloGrupoPersonales:PRIVADOS`;

  // Mobile layout: only one visibility column is shown, chosen with a selector.
  // Touch devices in portrait (phones and tablets) and phones in landscape (low height).
  // Tablets in landscape keep the normal multi-column layout.
  private readonly mobileLayoutQuery = window.matchMedia(
    '(pointer: coarse) and (orientation: portrait), (pointer: coarse) and (orientation: landscape) and (max-height: 500px)'
  );
  private readonly onMobileLayoutChange = (e: MediaQueryListEvent) => this.isMobileLayout.set(e.matches);
  isMobileLayout = signal(this.mobileLayoutQuery.matches);
  mobileColumn = signal<string>(sessionStorage.getItem('homeMobileColumn') || '');
  readonly mobileColumnOptions = [
    { label: this.publicTitle, value: 'shared' },
    { label: this.commonTitle, value: 'public' },
    { label: this.groupTitle, value: 'group' },
    { label: this.privateTitle, value: 'private' },
  ];

  constructor(private userService: UserService, private groupService: GroupService) { }

  ngOnInit(): void {
    this.mobileLayoutQuery.addEventListener('change', this.onMobileLayoutChange);
    this.loadReports(true);
    this.ifAnonymousGetOut();
    this.dashboardCreatedSub = this.dashboardService.dashboardCreated$.subscribe(() => this.loadReports());
  }

  ngOnDestroy(): void {
    this.mobileLayoutQuery.removeEventListener('change', this.onMobileLayoutChange);
    this.outsideClickSub?.unsubscribe();
    this.dashboardCreatedSub?.unsubscribe();
  }

  public isColumnVisible(colKey: string): boolean {
    return !this.isMobileLayout() || this.mobileColumn() === colKey;
  }

  public onMobileColumnChange(colKey: string): void {
    this.mobileColumn.set(colKey);
    sessionStorage.setItem('homeMobileColumn', colKey);
    // An open folder in another column would leave the selected one empty
    const exp = this.expandedFolder();
    if (exp && exp.colKey !== colKey) {
      this.closeFolder();
    }
  }

  private setDefaultMobileColumn(): void {
    if (this.mobileColumn()) return;
    const firstWithReports = ['private', 'group', 'public', 'shared'].find(key => this.reportMap[key]?.length > 0);
    this.mobileColumn.set(firstWithReports || 'private');
  }

  private setIsObserver = async () => {
      this.groupService.getGroupsByUser().subscribe(
          res => {
              const user = localStorage.getItem('user');
              const userID = JSON.parse(user)._id;
              this.grups = res;
              this.isObserver = this.grups.filter(group => group.name === 'EDA_RO' && group.users.includes(userID)).length !== 0;
          },
          (err) => this.alertService.addError(err)
      );
  }

  private ifAnonymousGetOut(): void {
      const user = localStorage.getItem('user');
      const userName = JSON.parse(user).name;

      if (userName === 'edaanonim' || userName === 'EDA_RO') {
          this.router.navigate(['/login']);
      }
  }

  private async loadReports(applyDefaultTagSelection = false) {
    const { publics, shared, dashboards, group } = await lastValueFrom(this.dashboardService.getDashboards());
    this.publicReports = shared;
    this.privateReports = dashboards;
    this.roleReports = group;
    this.sharedReports = publics;

    this.allDashboards = [].concat(this.publicReports, this.privateReports, this.roleReports, this.sharedReports);

    this.reportMap = {
      private: this.privateReports,
      group: this.roleReports,
      public: this.publicReports,
      shared: this.sharedReports
    };

    if (applyDefaultTagSelection) {
      this.setDefaultTagSelection(this.allDashboards.length);
    }
    this.setDefaultMobileColumn();

    this.handleSorting();
    this.loadReportTags();
    this.setIsObserver();
    this.reportsLoaded.set(true);
  }

  private setDefaultTagSelection(dashboardCount: number): void {
    const moreThan20Dashboards = dashboardCount > 20;
    const todoGroupedOption = { label: this.allTagsGroupedLabel, value: this.allTagsValue };
    const todoFlatOption = { label: this.allTagsFlatLabel, value: this.allTagsFlatValue };
    this.selectedTags.set(moreThan20Dashboards ? todoGroupedOption : todoFlatOption);
    sessionStorage.setItem('activeTags', JSON.stringify(moreThan20Dashboards ? todoGroupedOption : todoFlatOption));
    this.viewMode.set(moreThan20Dashboards ? 'folders' : 'flat');
  }

  private async loadReportTags() {
    this.tags = _.uniqBy(
      [...this.allDashboards]
      .flatMap(db => db.config.tag)
      .filter(tag => tag !== null && tag !== undefined)
      .flatMap(tag => Array.isArray(tag) ? tag : [tag])
      .map(tag => typeof tag === 'string' ? { label: tag, value: tag } : tag),
      'value'
    );

    this.tags.unshift({ label: $localize`:@@NoTag:Sin Etiqueta`, value: $localize`:@@NoTag:Sin Etiqueta`, });
    this.tags.push({ label: this.allTagsFlatLabel, value: this.allTagsFlatValue });
    if (this.allDashboards.length >= 20) {
      this.tags.push({ label: this.allTagsGroupedLabel, value: this.allTagsValue });
    }
    this.reapplyFilters();
  }

  public openReport(report: any, event: MouseEvent) {
    if (this.isEditing || this.isCdkDragging) { return; }
    if (event.button === 2) { return; } // right-click: let the context menu show, don't navigate
    const urlTree = this.router.createUrlTree(['/dashboard', report._id]);
    const relativeUrl = this.router.serializeUrl(urlTree);

    if (event.button === 1 || event.ctrlKey) {
      window.open('#/' + relativeUrl);
      return;
    }

    this.router.navigate(['/dashboard', report._id]);
  }

  public handleTagSelect(option: any): void {
    const currentFilters = this.selectedTags();
    const isSelected = currentFilters.value === option.value;

    if (isSelected) {
      const todoFlatOption = { label: this.allTagsFlatLabel, value: this.allTagsFlatValue };
      this.selectedTags.set(todoFlatOption);
      sessionStorage.setItem('activeTags', JSON.stringify(todoFlatOption));
      this.viewMode.set('flat');
      this.expandedFolder.set(null);
    } else {
      this.selectedTags.set(option);
      sessionStorage.setItem('activeTags', JSON.stringify(option));
      this.viewMode.set(option.value === this.allTagsValue ? 'folders' : 'flat');
      this.expandedFolder.set(null);
    }

    this.isOpenTags.set(false);
    this.reapplyFilters();
  }

  // ---- Drag & drop (Angular CDK): live hover highlight + the actual drop ----
  // The hover highlight is applied by mutating DOM classes directly (no Angular bindings, no
  // change detection) so it stays smooth even while CDK's own pointer tracking runs outside the zone.

  /** Finds the folder card (if any) under a viewport point, via its data-folder-* attributes. */
  private folderElementAt(x: number, y: number): HTMLElement | null {
    const el = document.elementFromPoint(x, y);
    return el?.closest('[data-folder-tag]') as HTMLElement | null;
  }

  private setHighlight(el: HTMLElement | null): void {
    if (this.currentHighlightEl === el) return;
    this.currentHighlightEl?.classList.remove('drop-zone-active');
    el?.classList.add('drop-zone-active');
    this.currentHighlightEl = el;
  }

  public onCdkDragStarted(): void {
    this.isCdkDragging = true;
  }

  public onCdkDragMoved(event: CdkDragMove<any>): void {
    const now = performance.now();
    if (now - this.lastDragMoveCheck < 100) return;
    this.lastDragMoveCheck = now;

    const { x, y } = event.pointerPosition;
    const payload = event.source.data as DragPayload;
    const colEl = document.elementFromPoint(x, y)?.closest('[data-col-key]') as HTMLElement | null;

    if (!colEl) { this.setHighlight(null); return; }

    const overColKey = colEl.dataset.colKey!;
    const exp = this.expandedFolder();

    if (exp && exp.colKey === overColKey) {
      this.setHighlight(payload.type === 'folder' ? null : colEl);
      return;
    }

    const folderEl = payload.type === 'report' ? this.folderElementAt(x, y) : null;
    this.setHighlight(folderEl ?? colEl);
  }

  public onCdkDragEnded(): void {
    this.setHighlight(null);
    // 'click' fires right after 'mouseup', synchronously before this timeout runs, so the
    // next click handler still sees isCdkDragging === true and can ignore a drag-triggered click.
    setTimeout(() => { this.isCdkDragging = false; }, 0);
  }

  public onColumnCdkDrop(event: CdkDragDrop<any, any, any>, colKey: string): void {
    this.setHighlight(null);
    const payload = event.item.data as DragPayload;
    if (!payload) return;
    const dropPoint = event.dropPoint;

    // Let CDK finish animating/removing its own drag preview before running the (heavier)
    // state update + change detection, so the preview doesn't appear to hang mid-air.
    requestAnimationFrame(() => this.processColumnDrop(payload, colKey, dropPoint));
  }

  private processColumnDrop(payload: DragPayload, colKey: string, dropPoint: { x: number; y: number }): void {
    const exp = this.expandedFolder();
    if (exp && exp.colKey === colKey) {
      // The whole column is showing one open folder: dropping anywhere in it means "into this folder"
      if (payload.type === 'report') {
        this.handleReportDroppedOnFolder(payload.report, payload.fromColKey, payload.fromTag, colKey, exp.tag);
      }
      return;
    }

    if (payload.type === 'report') {
      const folderEl = this.folderElementAt(dropPoint.x, dropPoint.y);
      if (folderEl) {
        this.handleReportDroppedOnFolder(payload.report, payload.fromColKey, payload.fromTag, colKey, folderEl.dataset.folderTag!);
      } else {
        this.handleReportDroppedOnColumn(payload.report, payload.fromColKey, payload.fromTag, colKey);
      }
    } else {
      this.handleFolderDroppedOnColumn(payload.tag, payload.fromColKey, colKey);
    }
  }

  // ---- Drag & drop business logic ----

  private columnTitle(colKey: string): string {
    switch (colKey) {
      case 'shared': return this.publicTitle;
      case 'public': return this.commonTitle;
      case 'group': return this.groupTitle;
      case 'private': return this.privateTitle;
      default: return colKey;
    }
  }

  private persistReportField(report: any, key: string, newValue: any): void {
    this.dashboardService.updateDashboardSpecific(report._id.toString(), { data: { key, newValue } }).subscribe(
      () => {},
      err => { this.alertService.addError(err); this.loadReports(); }
    );
  }

  private async pickGroupForAssignment(): Promise<string[] | null> {
    if (!this.grups || this.grups.length === 0) {
      this.alertService.addError($localize`:@@noGroupsToAssignDrag:No perteneces a ningún grupo al que asignar el informe.`);
      return null;
    }
    if (this.grups.length === 1) return [this.grups[0]['_id']];

    const inputOptions: Record<string, string> = {};
    this.grups.forEach(g => inputOptions[g['_id']] = g['name']);

    const result = await Swal.fire({
      title: $localize`:@@selectGroupDragTitle:Selecciona el grupo`,
      input: 'select',
      inputOptions,
      showCancelButton: true,
      confirmButtonText: $localize`:@@moveFolderConfirmBtn:Sí, mover`,
      cancelButtonText: $localize`:@@cancelarBtn:Cancelar`,
    });
    return result.value ? [result.value] : null;
  }

  private applyVisibilityChange(report: any, fromColKey: string, toColKey: string, newGroupIds: string[] | null): void {
    const fromArr = this.reportMap[fromColKey];
    const idx = fromArr ? fromArr.findIndex((r: any) => r._id === report._id) : -1;
    if (idx !== -1) fromArr.splice(idx, 1);
    this.reportMap[toColKey].push(report);

    report.config.visible = this.colKeyToVisible[toColKey];
    report.group = toColKey === 'group' ? newGroupIds : [];

    this.persistReportField(report, 'config.visible', report.config.visible);
    if (toColKey === 'group') this.persistReportField(report, 'group', newGroupIds);
  }

  private async handleReportDroppedOnColumn(report: any, fromColKey: string, fromTag: string | null, toColKey: string): Promise<void> {
    if (fromColKey === toColKey) return; // dropped back where it already was

    let newGroupIds: string[] | null = null;
    if (toColKey === 'group') {
      newGroupIds = await this.pickGroupForAssignment();
      if (!newGroupIds) return;
    }

    this.applyVisibilityChange(report, fromColKey, toColKey, newGroupIds);

    if (fromTag) {
      // Dragged out of a tag-folder into a different column: that tag no longer applies
      const newTags = this.normTagArr(report.config).filter(t => t !== fromTag);
      report.config.tag = newTags;
      this.persistReportField(report, 'config.tag', newTags);
    }

    this.loadReportTags();
  }

  private async handleReportDroppedOnFolder(report: any, fromColKey: string, fromTag: string | null, toColKey: string, toTag: string): Promise<void> {
    const sameColumn = fromColKey === toColKey;
    if (sameColumn && fromTag === toTag) return; // dropped back into the same folder

    let newGroupIds: string[] | null = null;
    if (!sameColumn && toColKey === 'group') {
      newGroupIds = await this.pickGroupForAssignment();
      if (!newGroupIds) return;
    }

    if (!sameColumn) {
      this.applyVisibilityChange(report, fromColKey, toColKey, newGroupIds);
    }

    const newTags = this.normTagArr(report.config).filter(t => t !== fromTag);
    if (!newTags.includes(toTag)) newTags.push(toTag);
    report.config.tag = newTags;
    this.persistReportField(report, 'config.tag', newTags);

    this.loadReportTags();
  }

  private handleFolderDroppedOnColumn(tag: string, fromColKey: string, toColKey: string): void {
    if (fromColKey === toColKey) return;

    const fromArr = this.reportMap[fromColKey];
    const affected = fromArr.filter((r: any) => this.normTagArr(r.config).includes(tag));
    if (affected.length === 0) return;

    const dashboardsLabel = $localize`:@@folderReportCount:informes`;
    Swal.fire({
      title: $localize`:@@moveFolderConfirmTitle:¿Mover carpeta?`,
      text: `"${tag}": ${affected.length} ${dashboardsLabel} → ${this.columnTitle(toColKey)}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: $localize`:@@moveFolderConfirmBtn:Sí, mover`,
      cancelButtonText: $localize`:@@cancelarBtn:Cancelar`,
    }).then(async res => {
      if (!res.value) return;

      let newGroupIds: string[] | null = null;
      if (toColKey === 'group') {
        newGroupIds = await this.pickGroupForAssignment();
        if (!newGroupIds) return;
      }

      for (const report of [...affected]) {
        this.applyVisibilityChange(report, fromColKey, toColKey, newGroupIds);
      }

      const exp = this.expandedFolder();
      if (exp && exp.tag === tag && exp.colKey === fromColKey) {
        this.closeFolder();
      }

      this.loadReportTags();
    });
  }

  public clickFolder(tag: string, colKey: string): void {
    if (this.isCdkDragging) { return; }
    const current = this.expandedFolder();
    if (current?.tag === tag && current?.colKey === colKey) {
      this.closeFolder();
      return;
    }
    this.expandedFolder.set({ tag, colKey });
    this.viewMode.set('flat');
  }

  public closeFolder(event?: MouseEvent): void {
    event?.stopPropagation();
    this.expandedFolder.set(null);
    const todoGroupedOption = { label: this.allTagsGroupedLabel, value: this.allTagsValue };
    this.selectedTags.set(todoGroupedOption);
    sessionStorage.setItem('activeTags', JSON.stringify(todoGroupedOption));
    this.viewMode.set('folders');
  }

  public getTagsInReports(reports: any[]): string[] {
    const tagSet = new Set<string>();
    for (const report of reports) {
      for (const tag of this.normTagArr(report.config)) {
        if (tag && tag.trim()) tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }

  public getReportsByTag(reports: any[], tag: string): any[] {
    return reports.filter(r => this.normTagArr(r.config).includes(tag));
  }

  public getUntaggedReports(reports: any[]): any[] {
    return reports.filter(r => this.normTagArr(r.config).filter(t => t.trim()).length === 0);
  }

  public filteredTags(): any[] {
    return this.tags.filter((option) => option.label.toLowerCase().includes(this.searchTagTerm().toLowerCase()));
  }

  public removeTag(filterToRemove: any): void {
    this.selectedTags.set(this.selectedTags().filter((filter) => filter.value !== filterToRemove.value));
    sessionStorage.setItem('activeTags', JSON.stringify((() => {
      const tags = JSON.parse(sessionStorage.getItem('activeTags') || '[]');
      return tags.filter(tag => tag.value !== filterToRemove.value);
    })()));
    this.reapplyFilters();
  }

  public toggleDropdownTags(): void {
    this.isOpenTags.set(!this.isOpenTags());
  }

  public isTagSelected(optionValue: string): boolean {
    return this.selectedTags().value === optionValue;
  }

  public onCreateDashboard() {
    this.createDashboardService.open();
  }

  public canEditReport(report: any): boolean {
    if (!report.onlyIcanEdit) return true;
    return report.user === this.userService.user?._id|| this.userService.isAdmin;
  }

  public get canManageDatasources(): boolean {
    return this.userService.isAdmin || this.userService.isDataSourceCreator;
  }

  public filterByTags() {
    const tags = sessionStorage.getItem('activeTags') || '[]';
    if (tags.includes($localize`:@@AllTags:Todos`) || tags.includes(this.allTagsFlatValue) || tags === '[]') {
      this.publicReports  = [...this.reportMap.public];
      this.sharedReports  = [...this.reportMap.shared];
      this.privateReports = [...this.reportMap.private];
      this.roleReports    = [...this.reportMap.group];
    } else {
      this.publicReports  = this.checkTagsIntoReports(this.reportMap.public, tags);
      this.sharedReports  = this.checkTagsIntoReports(this.reportMap.shared, tags);
      this.privateReports = this.checkTagsIntoReports(this.reportMap.private, tags);
      this.roleReports    = this.checkTagsIntoReports(this.reportMap.group, tags);
    }
  }

  private checkTagsIntoReports(reports, tags) {
    return reports.filter(db => {
        const tag = db.config?.tag;

        if (tags.includes($localize`:@@NoTag:Sin Etiqueta`)) {
          return tag === null || tag === undefined || tag === '';
        }

        if (!tag || tag === '') return false;

        const tagArray = Array.isArray(tag)
          ? tag.map(t => typeof t === 'string' ? t : t.value || t.label)
          : [typeof tag === 'string' ? tag : tag.value || tag.label];

        return tagArray.some(t => tags.includes(t));
    });
  }

  private parseSearchQuery(raw: string): { title: string, author: string, datasource: string, tag: string, createdFrom: string, createdTo: string, modifiedFrom: string, modifiedTo: string } {
    const result = { title: '', author: '', datasource: '', tag: '', createdFrom: '', createdTo: '', modifiedFrom: '', modifiedTo: '' };
    const titleParts: string[] = [];
    for (const token of raw.trim().split(/\s+/)) {
      if (token.startsWith('au:')) {
        result.author = token.slice(3);
      } else if (token.startsWith('ds:')) {
        result.datasource = token.slice(3);
      } else if (token.startsWith('tag:')) {
        result.tag = token.slice(4);
      } else if (token.startsWith('cr:')) {
        const parts = token.slice(3).split('..');
        result.createdFrom = parts[0];
        result.createdTo   = parts[1] || '';
      } else if (token.startsWith('mo:')) {
        const parts = token.slice(3).split('..');
        result.modifiedFrom = parts[0];
        result.modifiedTo   = parts[1] || '';
      } else {
        titleParts.push(token);
      }
    }
    result.title = titleParts.join(' ');
    return result;
  }

  private getActiveTagBase() {
    const activeTags = sessionStorage.getItem('activeTags') || '[]';
    const hasActiveTag = !activeTags.includes($localize`:@@AllTags:Todos`) && !activeTags.includes(this.allTagsFlatValue) && activeTags !== '[]';
    return {
      public:  hasActiveTag ? this.checkTagsIntoReports(this.reportMap.public,  activeTags) : this.reportMap.public,
      shared:  hasActiveTag ? this.checkTagsIntoReports(this.reportMap.shared,  activeTags) : this.reportMap.shared,
      private: hasActiveTag ? this.checkTagsIntoReports(this.reportMap.private, activeTags) : this.reportMap.private,
      group:   hasActiveTag ? this.checkTagsIntoReports(this.reportMap.group,   activeTags) : this.reportMap.group,
    };
  }

  private normTagArr(cfg: any): string[] {
    const t = cfg.tag;
    if (!t) return [];
    return (Array.isArray(t) ? t : [t]).map(x => typeof x === 'string' ? x : x.value || x.label || '');
  }

  public filterByTitle(event: Event) {
    const raw = (event.target as HTMLInputElement).value?.toString().trim() || '';
    this.applyTitleFilter(raw);
  }

  private applyTitleFilter(raw: string) {
    if (raw.length <= 1) {
      this.filterByTags();
      return;
    }

    const { title, author, datasource, tag, createdFrom, createdTo, modifiedFrom, modifiedTo } = this.parseSearchQuery(raw);

    const filterFn = (reports: any[]) => reports.filter(db => {
      const cfg = db.config;
      if (title      && !cfg.title?.toUpperCase().includes(title.toUpperCase())) return false;
      if (author     && !cfg.author?.toLowerCase().startsWith(author.toLowerCase())) return false;
      if (datasource && !cfg.ds?.name?.toLowerCase().includes(datasource.toLowerCase())) return false;
      if (tag        && !this.normTagArr(cfg).some(t => t.toLowerCase().includes(tag.toLowerCase()))) return false;
      if (createdFrom  && new Date(cfg.createdAt) < new Date(createdFrom)) return false;
      if (createdTo    && new Date(cfg.createdAt) > new Date(createdTo + 'T23:59:59')) return false;
      if (modifiedFrom && new Date(cfg.modifiedAt) < new Date(modifiedFrom)) return false;
      if (modifiedTo   && new Date(cfg.modifiedAt) > new Date(modifiedTo + 'T23:59:59')) return false;
      return true;
    });

    const base = this.getActiveTagBase();
    this.publicReports  = filterFn(base.public);
    this.sharedReports  = filterFn(base.shared);
    this.privateReports = filterFn(base.private);
    this.roleReports    = filterFn(base.group);
  }

  private reapplyFilters(): void {
    const hasAdvanced = this.advancedFilters.author || this.advancedFilters.datasource
      || this.advancedTags.length > 0
      || (this.createdRange?.length >= 1 && this.createdRange[0])
      || (this.modifiedRange?.length >= 1 && this.modifiedRange[0]);

    if (hasAdvanced) {
      this.applyAdvancedFilters(false);
      return;
    }

    if (this.searchQuery && this.searchQuery.trim().length > 1) {
      this.applyTitleFilter(this.searchQuery.trim());
      return;
    }

    this.filterByTags();
  }

  copyReport(report: any) {
    const currentUrl = window.location.href;
    const dashboardUrl = `${currentUrl.replace(/\/home\/?$/, '')}/public/${report._id}`;
    navigator.clipboard.writeText(dashboardUrl).then(() => {
      this.alertService.addSuccess($localize`:@@copyPublicLinkSuccessText:El enlace público ha sido copiado al portapapeles.`);
    });
  }

  renameReport(report: any) {
    this.isEditing = true;
    this.editingReportId = report._id;
    this.editTitle = report.config?.title || '';

    setTimeout(() => {
      const inputElement = document.querySelector<HTMLInputElement>('.edit-title-input');
      if (inputElement) { inputElement.focus(); }
    }, 0);
  }

  handleEditing(code: string, report: any) {
    switch (code) {
      case 'done':
        if (this.editTitle.trim()) {
          report.config.title = this.editTitle;

          const payload = {
            data: {
              key: 'config.title',
              newValue: report.config.title
            }
          };

          this.dashboardService.updateDashboardSpecific(report._id.toString(), payload).subscribe(
            () => {
              this.allDashboards[this.allDashboards.findIndex(d => d._id === report._id)].config.title = report.config.title;
              this.alertService.addSuccess($localize`:@@DashboardUpdatedInfo:El dashboard ha sido actualizado correctamente.`);
            },
            err => this.alertService.addError(err)
          );
        }
        break;
      case 'cancel':
        break;
    }
    this.isEditing = false;
    this.editingReportId = null;
    this.editTitle = '';
  }

  public deleteReport(report: any): void {
    let text = $localize`:@@deleteDashboardWarning:Estás a punto de borrar el informe:`;
    Swal.fire({
      title: $localize`:@@Sure:¿Estás seguro?`,
      text: `${text} ${report.config.title}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: $localize`:@@ConfirmDeleteModel:Si, ¡Eliminalo!`,
      cancelButtonText: $localize`:@@cancelarBtn:Cancelar`,
    }).then(deleted => {
      if (deleted.value) {
        this.dashboardService.deleteDashboard(report._id).subscribe(
          () => {
            this.allDashboards = this.allDashboards.filter(d => d._id !== report._id);

            const targetArray = this.reportMap[report.config.visible];
            if (targetArray) {
              const originalIndex = targetArray.findIndex(d => d._id === report._id);

              if (originalIndex !== -1) {
                targetArray.splice(originalIndex, 1);
              }
            }

            const listNames = ['publicReports', 'privateReports', 'roleReports', 'sharedReports'];

            for (const name of listNames) {
              const list = this[name];
              if (list.some(d => d._id === report._id)) {
                this[name] = list.filter(d => d._id !== report._id);
                break;
              }
            }
            this.loadReportTags();
            this.alertService.addSuccess($localize`:@@DashboardDeletedInfo:Informe eliminado correctamente.`);
          },
          err => this.alertService.addError(err)
        );
      }
    });
  }

  public cloneReport(report: any): void {
    this.dashboardService.cloneDashboard(report._id).subscribe(
      async response => {
        if (response.ok && response.dashboard) {
          const newId = response.dashboard._id;

          await this.loadReports();

          const allReports = [
            ...this.privateReports, ...this.publicReports,
            ...this.roleReports,    ...this.sharedReports
          ];
          const clonedReport = allReports.find(d => d._id === newId);
          if (clonedReport) {
            clonedReport.isNewlyCloned = true;
            setTimeout(() => {
              document.getElementById(`dashboard-${newId}`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
            setTimeout(() => { clonedReport.isNewlyCloned = false; }, 5000);
          }

          this.alertService.addSuccess($localize`:@@REPORTCloned:Informe clonado correctamente`);
        } else {
          throw new Error($localize`:@@InvalidServerResponse:Respuesta inválida del servidor`);
        }
      },
      error => {
        this.alertService.addError($localize`:@@CouldNotCloneReport:No se pudo clonar el informe. Por favor, inténtalo de nuevo.`);
      }
    );
  }

  handleSorting() {
    switch (this.sortingType) {
      case 'dateAsc':
        this.sortingReports('modifiedAt', this.reportMap, 'asc');
        sessionStorage.setItem('homeSorting', 'dateAsc');
        break;
      case 'dateDesc':
        this.sortingReports('modifiedAt', this.reportMap, 'desc');
        sessionStorage.setItem('homeSorting', 'dateDesc');
        break;
      default:
        this.sortingReports('title', this.reportMap, 'asc');
        sessionStorage.setItem('homeSorting', 'name');
        break;
    }
  }

  toggleAdvancedFilter(event: Event) {
    event.stopPropagation();
    const opening = !this.showAdvancedFilter();
    this.showAdvancedFilter.set(opening);

    if (opening) {
      this.outsideClickSub = fromEvent<MouseEvent>(document, 'click')
        .pipe(filter(e => {
          const target = e.target as HTMLElement;
          return !target.closest('.p-datepicker') && !target.closest('.p-multiselect-panel');
        }))
        .subscribe(() => {
          this.showAdvancedFilter.set(false);
          this.outsideClickSub?.unsubscribe();
        });
    } else {
      this.outsideClickSub?.unsubscribe();
    }
  }

  applyAdvancedFilters(updateSearchBar = true) {
    const { author, datasource } = this.advancedFilters;
    const hasCreated  = this.createdRange?.length >= 1 && this.createdRange[0];
    const hasModified = this.modifiedRange?.length >= 1 && this.modifiedRange[0];
    const hasTags     = this.advancedTags.length > 0;
    const hasFilters  = author || datasource || hasCreated || hasModified || hasTags;

    if (!hasFilters) {
      this.filterByTags();
      return;
    }

    const filterFn = (reports: any[]) => reports.filter(db => {
      const cfg = db.config;
      if (author     && !cfg.author?.toLowerCase().includes(author.toLowerCase())) return false;
      if (datasource && !cfg.ds?.name?.toLowerCase().includes(datasource.toLowerCase())) return false;
      if (hasTags    && !this.advancedTags.some(t => {
        if (t === $localize`:@@NoTag:Sin Etiqueta`) {
          const tag = cfg.tag;
          return tag === null || tag === undefined || tag === '';
        }
        return this.normTagArr(cfg).includes(t);
      })) return false;
      if (hasCreated) {
        const created = new Date(cfg.createdAt);
        if (this.createdRange[0] && created < this.createdRange[0]) return false;
        if (this.createdRange[1] && created > this.createdRange[1]) return false;
      }
      if (hasModified) {
        const modified = new Date(cfg.modifiedAt);
        if (this.modifiedRange[0] && modified < this.modifiedRange[0]) return false;
        if (this.modifiedRange[1] && modified > this.modifiedRange[1]) return false;
      }
      return true;
    });

    const base = this.getActiveTagBase();
    this.publicReports  = filterFn(base.public);
    this.sharedReports  = filterFn(base.shared);
    this.privateReports = filterFn(base.private);
    this.roleReports    = filterFn(base.group);
    if (updateSearchBar) this.buildSearchQuery();
  }

  private buildSearchQuery(): void {
    const parts: string[] = [];
    if (this.advancedFilters.author)     parts.push(`au:${this.advancedFilters.author}`);
    if (this.advancedFilters.datasource) parts.push(`ds:${this.advancedFilters.datasource}`);
    this.advancedTags.forEach(t => parts.push(`tag:${t}`));
    if (this.createdRange?.length >= 1 && this.createdRange[0]) {
      const from = this.formatDateForQuery(this.createdRange[0]);
      const to   = this.createdRange[1] ? `..${this.formatDateForQuery(this.createdRange[1])}` : '';
      parts.push(`cr:${from}${to}`);
    }
    if (this.modifiedRange?.length >= 1 && this.modifiedRange[0]) {
      const from = this.formatDateForQuery(this.modifiedRange[0]);
      const to   = this.modifiedRange[1] ? `..${this.formatDateForQuery(this.modifiedRange[1])}` : '';
      parts.push(`mo:${from}${to}`);
    }
    this.searchQuery = parts.join(' ');
  }

  onCreatedDatesChange(event: { dates: Date[], range: any }) {
    this.createdRange = event.dates || [];
    this.applyAdvancedFilters();
  }

  onModifiedDatesChange(event: { dates: Date[], range: any }) {
    this.modifiedRange = event.dates || [];
    this.applyAdvancedFilters();
  }

  private formatDateForQuery(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  clearAdvancedFilters() {
    this.advancedFilters = { author: '', datasource: '' };
    this.advancedTags = [];
    this.createdRange = [];
    this.modifiedRange = [];
    this.createdPickerConfig  = { dateRange: [], range: null, filter: null };
    this.modifiedPickerConfig = { dateRange: [], range: null, filter: null };
    this.searchQuery = '';
    this.filterByTags();
  }

  sortingReports(type: string, reports: any, direction: string) {
    const compareFn = (a: any, b: any) => {
      const valA = a.config[type];
      const valB = b.config[type];
      if (type === 'modifiedAt') {
        const dateA = new Date(valA);
        const dateB = new Date(valB);

        return direction === 'asc'
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      }

      const comparison = valA.localeCompare(valB);
      return direction === 'asc' ? comparison : -comparison;
    };

    this.publicReports = reports.public.sort(compareFn);
    this.privateReports = reports.private.sort(compareFn);
    this.roleReports = reports.group.sort(compareFn);
    this.sharedReports = reports.shared.sort(compareFn);
  }
}
