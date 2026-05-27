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

@Component({
  selector: 'app-v2-home-page',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet, IconComponent, CommonModule, EdaDatePickerComponent, DropdownModule, MultiSelectModule, ChatbotComponent],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.css']
})
export class HomePage implements OnInit, OnDestroy {
  private createDashboardService = inject(CreateDashboardService);
  private dashboardService = inject(DashboardService);
  private alertService = inject(AlertService);
  private router = inject(Router);

  allDashboards: any[] = [];
  publicReports: any[] = [];
  privateReports: any[] = [];
  roleReports: any[] = [];
  sharedReports: any[] = [];
  reportMap: any = {};

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

  constructor(private userService: UserService, private groupService: GroupService) { }

  ngOnInit(): void {
    this.initTagSelection();
    this.loadReports();
    this.ifAnonymousGetOut();
  }

  ngOnDestroy(): void {
    this.outsideClickSub?.unsubscribe();
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

  private async loadReports() {
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

    this.handleSorting();
    this.loadReportTags();
    this.setIsObserver();
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
    if(this.isEditing){return;}
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

  private async initTagSelection(): Promise<void> {
    const dashboards = await lastValueFrom(this.dashboardService.getDashboards());
    const AllDashboards = [...dashboards.publics, ...dashboards.shared, ...dashboards.dashboards, ...dashboards.group];
    const moreThan20Dashboards = AllDashboards.length > 20;
    const todoGroupedOption = { label: this.allTagsGroupedLabel, value: this.allTagsValue };
    const todoFlatOption = { label: this.allTagsFlatLabel, value: this.allTagsFlatValue };
    this.selectedTags.set(moreThan20Dashboards ? todoGroupedOption : todoFlatOption);
    sessionStorage.setItem('activeTags', JSON.stringify(moreThan20Dashboards ? todoGroupedOption : todoFlatOption));
    this.viewMode.set(moreThan20Dashboards ? 'folders' : 'flat');
  }

  public clickFolder(tag: string, colKey: string): void {
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
    return report.config.author === this.userService.user?.name || this.userService.isAdmin;
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
      if (datasource && !cfg.ds?.type?.toLowerCase().includes(datasource.toLowerCase())) return false;
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
      response => {
        if (response.ok && response.dashboard) {
          const clonedReport = _.cloneDeep(report);
          Object.assign(clonedReport, response.dashboard);

          clonedReport.type = clonedReport.config.visible;
          clonedReport.user = this.userService.user.name;

          const currentDate = new Date().toISOString().split('T')[0];
          clonedReport.config.createdAt = currentDate;
          clonedReport.config.modifiedAt = currentDate;

          clonedReport.config.author = JSON.parse(localStorage.getItem('user')).name;

          const targetArray = this.reportMap[clonedReport.type];
          if (targetArray) {
            const originalIndex = targetArray.findIndex(d => d._id === report._id);
            if (originalIndex !== -1) {
              targetArray.splice(originalIndex + 1, 0, clonedReport);
            } else {
              targetArray.push(clonedReport);
            }
          }

          this.handleSorting();
          this.reapplyFilters();

          clonedReport.isNewlyCloned = true;

          setTimeout(() => {
            const element = document.getElementById(`dashboard-${clonedReport._id}`);
            if (element) {
              element.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
              });
            }
          }, 500);

          setTimeout(() => {
            clonedReport.isNewlyCloned = false;
          }, 5000);

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
      if (datasource && !cfg.ds?.type?.toLowerCase().includes(datasource.toLowerCase())) return false;
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
