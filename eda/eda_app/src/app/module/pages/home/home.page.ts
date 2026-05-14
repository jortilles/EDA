import { Component, inject, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewChecked, NgZone } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { Router } from '@angular/router';
import { lastValueFrom, fromEvent, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { UserService } from '@eda/services/api/user.service';
import { GroupService } from '@eda/services/api/group.service';
import { AlertService, DashboardService } from '@eda/services/service.index';
import { CreateDashboardService } from '@eda/services/utils/create-dashboard.service';
import { IaChatService, ChatMessage, ChatOption } from '@eda/services/api/ia-chat.service';
import Swal from 'sweetalert2';
import * as _ from 'lodash';
import { CommonModule } from '@angular/common';
import { EdaDatePickerComponent } from '@eda/shared/components/eda-date-picker/eda-date-picker.component';
import { EdaDatePickerConfig } from '@eda/shared/components/eda-date-picker/datePickerConfig';
import { MultiSelectModule } from 'primeng/multiselect';
import { CORPORATE_COLORS } from '@eda/configs/index';

@Component({
  selector: 'app-v2-home-page',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet, IconComponent, CommonModule, EdaDatePickerComponent, MultiSelectModule],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.css']
})
export class HomePage implements OnInit, OnDestroy, AfterViewChecked {
  readonly corporateColors = CORPORATE_COLORS;
  private createDashboardService = inject(CreateDashboardService);
  private dashboardService = inject(DashboardService);
  private alertService = inject(AlertService);
  private router = inject(Router);
  private iaChatService = inject(IaChatService);

  private sanitizer = inject(DomSanitizer);
  private zone = inject(NgZone);

  // --- Chat IA ---
  private markdownCache = new Map<string, SafeHtml>();
  @ViewChild('chatMessages') private chatMessagesRef!: ElementRef;
  @ViewChild('chatInputEl') private chatInputEl!: ElementRef<HTMLTextAreaElement>;
  chatOpen = signal(false);
  chatAvailable = signal(false);
  chatLoading = signal(false);
  chatHistory: ChatMessage[] = [];
  private shouldScrollChat = false;
  private chatInputListenerAdded = false;

  allDashboards: any[] = [];
  publicReports: any[] = [];
  privateReports: any[] = [];
  roleReports: any[] = [];
  sharedReports: any[] = [];
  reportMap: any = {};
  
  tags: any[] = [];
  selectedTags = signal<any>(JSON.parse(sessionStorage.getItem('activeTags') ? sessionStorage.getItem('activeTags') : '[]'));
  
  //Sistema de carpetas
  viewMode = signal<'folders' | 'flat'>('flat');
  expandedFolder = signal<{ tag: string; colKey: string } | null>(null);
  readonly allTagsValue = $localize`:@@AllTags:Todos`;
  readonly allTagsFlatValue = 'TodosFlat';
  readonly allTagsFlatLabel = $localize`:@@AllTagsFlat:Todo`;
  readonly allTagsGroupedLabel = $localize`:@@AllTagsGrouped:Todo agrupado`;

  isOpenTags = signal(false)
  searchTagTerm = signal("")

  // Control de anonim y eda_RO
  public grups: Array<any> = [];
  public isObserver: boolean = true;

  // Control de filtros avanzados
  showAdvancedFilter = signal(false);
  private outsideClickSub?: Subscription;
  searchQuery = '';
  advancedFilters = { author: '', datasource: '' };
  advancedTags: string[] = [];
  createdPickerConfig: EdaDatePickerConfig = { dateRange: [], range: null, filter: null };
  modifiedPickerConfig: EdaDatePickerConfig = { dateRange: [], range: null, filter: null };
  createdRange: Date[] = [];
  modifiedRange: Date[] = [];
  
  //Variables de control de edició Modificar
  isEditing = false;
  editingReportId: string | null = null;
  editTitle: string = '';
  sortingType: string = sessionStorage.getItem('homeSorting') || 'name';

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

  // Chat suggestions (used both as button label and as message text)
  public chatSuggestion1: string = $localize`:@@chatSuggestion1:¿Qué dashboards tengo?`;
  public chatSuggestion2: string = $localize`:@@chatSuggestion2:¿Qué datasources hay?`;
  public chatSuggestion3: string = $localize`:@@chatSuggestion3:Estado del servidor`;

  // Chat fallback option labels
  readonly chatFallbackYes: string = $localize`:@@chatFallbackYes:Sí`;
  readonly chatFallbackSearchIn: string = $localize`:@@chatFallbackSearchIn:Buscar en...`;
  readonly chatFallbackSearchInPrefix: string = $localize`:@@chatFallbackSearchInPrefix:Buscar en: `;

  constructor(private userService: UserService, private groupService: GroupService) { }

  ngOnInit(): void {
    this.initTagSelection();
    this.loadReports();
    this.ifAnonymousGetOut();
    this.iaChatService.getConfig().subscribe({
      next: (cfg) => this.chatAvailable.set(cfg.available),
      error: () => this.chatAvailable.set(false),
    });
  }

  ngAfterViewChecked(): void {
    // Registrar listener del textarea fuera de la zona de Angular (una sola vez)
    if (!this.chatInputListenerAdded && this.chatInputEl?.nativeElement) {
      this.chatInputListenerAdded = true;
      this.zone.runOutsideAngular(() => {
        this.chatInputEl.nativeElement.addEventListener('input', () => {
          const el = this.chatInputEl.nativeElement;
          el.style.height = 'auto';
          el.style.height = Math.min(el.scrollHeight, 120) + 'px';
        });
      });
    }
    if (this.shouldScrollChat && this.chatMessagesRef) {
      const el = this.chatMessagesRef.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScrollChat = false;
    }
  }

  resetChat(): void {
    this.chatHistory = [];
    this.chatLoading.set(false);
    setTimeout(() => this.chatInputEl?.nativeElement?.focus(), 50);
  }

  toggleChat(): void {
    const opening = !this.chatOpen();
    this.chatOpen.set(opening);
    if (opening) {
      setTimeout(() => this.chatInputEl?.nativeElement?.focus(), 50);
    }
  }

  useSuggestion(text: string): void {
    if (this.chatInputEl?.nativeElement) {
      this.chatInputEl.nativeElement.value = text;
    }
    this.sendChatMessage();
  }

  pasteToInput(text: string): void {
    if (this.chatInputEl?.nativeElement) {
      this.chatInputEl.nativeElement.value = text;
      this.chatInputEl.nativeElement.dispatchEvent(new Event('input'));
      this.chatInputEl.nativeElement.focus();
    }
  }

  onChatKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendChatMessage();
    }
  }

  sendChatMessage(): void {
    const text = this.chatInputEl?.nativeElement.value.trim() ?? '';
    if (!text || this.chatLoading()) return;

    this.chatHistory.push({ role: 'user', content: text });
    this.chatInputEl.nativeElement.value = '';
    this.chatInputEl.nativeElement.style.height = 'auto';
    this.chatLoading.set(true);
    this.shouldScrollChat = true;

    this.iaChatService.sendMessage(this.chatHistory).subscribe({
      next: (res) => {
        this.chatHistory.push({ role: 'assistant', content: res.response, options: res.options ?? [] });
        this.chatLoading.set(false);
        this.shouldScrollChat = true;
        setTimeout(() => this.chatInputEl?.nativeElement?.focus(), 50);
      },
      error: () => {
        this.chatHistory.push({ role: 'assistant', content: $localize`:@@chatErrorConnecting:Error al conectar con el asistente.` });
        this.chatLoading.set(false);
        this.shouldScrollChat = true;
        setTimeout(() => this.chatInputEl?.nativeElement?.focus(), 50);
      },
    });
  }

  selectOption(option: ChatOption): void {
    if (option.type === 'paste') {
      this.pasteToInput(this.chatFallbackSearchInPrefix);
      return;
    }
    if (this.chatLoading()) return;
    // Ocultar las opciones del mensaje que contenía esta selección
    const msgWithOptions = [...this.chatHistory].reverse().find(m => m.role === 'assistant' && m.options && m.options.length > 0);
    if (msgWithOptions) msgWithOptions.options = [];
    let displayLabel: string;
    let apiMsg: string;
    if (option.type === 'datasource') {
      displayLabel = option.label;
      apiMsg = option.datasource_id
        ? `sí (ejecuta get_data_from_dashboard con datasource_id="${option.datasource_id}"${option.campos_consulta?.length ? ` y campos_consulta=${JSON.stringify(option.campos_consulta)}` : ''})`
        : 'sí';
    } else {
      displayLabel = $localize`:@@chatOptionSelectedLabel:Opción` + ` ${option.num}: ${option.label}`;
      apiMsg = `${displayLabel} (dashboard_id: ${option.dashboard_id}, panel_index: ${option.panel_index})`;
    }
    this.chatHistory.push({ role: 'user', content: apiMsg, displayContent: displayLabel });
    this.chatLoading.set(true);
    this.shouldScrollChat = true;
    this.iaChatService.sendMessage(this.chatHistory).subscribe({
      next: (res) => {
        this.chatHistory.push({ role: 'assistant', content: res.response, options: res.options ?? [] });
        this.chatLoading.set(false);
        this.shouldScrollChat = true;
        setTimeout(() => this.chatInputEl?.nativeElement?.focus(), 50);
      },
      error: () => {
        this.chatHistory.push({ role: 'assistant', content: $localize`:@@chatErrorConnecting:Error al conectar con el asistente.` });
        this.chatLoading.set(false);
        this.shouldScrollChat = true;
        setTimeout(() => this.chatInputEl?.nativeElement?.focus(), 50);
      },
    });
  }

  renderMarkdown(text: string): SafeHtml {
    if (this.markdownCache.has(text)) return this.markdownCache.get(text)!;

    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 1. Code blocks → sentinel
    const codeBlocks: string[] = [];
    let html = text.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) => {
      const idx = codeBlocks.push(esc(code.trim())) - 1;
      return `\x00CODE${idx}\x00`;
    });

    // 2. Inline code → sentinel
    const inlineCodes: string[] = [];
    html = html.replace(/`([^`\n]+)`/g, (_, code) => {
      const idx = inlineCodes.push(esc(code)) - 1;
      return `\x00INLINE${idx}\x00`;
    });

    // 3. Named links [text](url) → sentinel (before bare URL processing)
    const linkBlocks: string[] = [];
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => {
      const idx = linkBlocks.push(
        `<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-link">${label}</a>`
      ) - 1;
      return `\x00LINK${idx}\x00`;
    });

    // 4. Tables (line-by-line, after link extraction so links work inside cells)
    const tableBlocks: string[] = [];
    const rawLines = html.split('\n');
    const processedLines: string[] = [];
    let li = 0;
    while (li < rawLines.length) {
      const cur = rawLines[li].trim();
      const nxt = rawLines[li + 1]?.trim() ?? '';
      if (cur.startsWith('|') && /^\|(?:[ \t]*:?-+:?[ \t]*\|)+$/.test(nxt)) {
        const headers = cur.split('|').slice(1, -1)
          .map(h => `<th>${h.trim()}</th>`).join('');
        li += 2; // skip header + separator row
        const bodyRows: string[] = [];
        while (li < rawLines.length && rawLines[li].trim().startsWith('|')) {
          const cells = rawLines[li].trim().split('|').slice(1, -1)
            .map(c => `<td>${c.trim()}</td>`).join('');
          bodyRows.push(`<tr>${cells}</tr>`);
          li++;
        }
        const tHtml = `<div class="chat-table-wrapper"><table class="chat-table"><thead><tr>${headers}</tr></thead><tbody>${bodyRows.join('')}</tbody></table></div>`;
        const tIdx = tableBlocks.push(tHtml) - 1;
        processedLines.push(`\x00TABLE${tIdx}\x00`);
      } else {
        processedLines.push(rawLines[li]);
        li++;
      }
    }
    html = processedLines.join('\n');

    // 5. Bare URLs → sentinel
    html = html.replace(/(https?:\/\/[^\s<>")\]\n\x00]+)/g, (_, url) => {
      const display = url.length > 55 ? url.substring(0, 52) + '…' : url;
      const idx = linkBlocks.push(
        `<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-link">${esc(display)}</a>`
      ) - 1;
      return `\x00LINK${idx}\x00`;
    });

    // 6. Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // 7. Italic (*text* and _text_)
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    html = html.replace(/\b_([^_\n]+)_\b/g, '<em>$1</em>');

    // 8. Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // 9. Headers
    html = html.replace(/^### (.+)$/gm, '<div class="chat-h3">$1</div>');
    html = html.replace(/^## (.+)$/gm, '<div class="chat-h2">$1</div>');
    html = html.replace(/^# (.+)$/gm, '<div class="chat-h1">$1</div>');

    // 10. Horizontal rule
    html = html.replace(/^---+$/gm, '<hr class="chat-hr">');

    // 11. Ordered lists 1. 2. 3.
    html = html.replace(/^[ \t]*\d+\. (.+)$/gm, '<li class="ol-li">$1</li>');
    html = html.replace(/(<li class="ol-li">[\s\S]*?<\/li>)/g, '<ol class="chat-ol">$1</ol>');
    html = html.replace(/<\/ol>\s*<ol class="chat-ol">/g, '');

    // 12. Bullet lists
    html = html.replace(/^[ \t]*[-*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul class="chat-list">$1</ul>');
    html = html.replace(/<\/ul>\s*<ul class="chat-list">/g, '');

    // 13. Paragraphs and line breaks
    html = html.replace(/\n\n+/g, '</p><p class="mt-2">');
    html = html.replace(/\n/g, '<br>');

    // 14. Restore all sentinels
    tableBlocks.forEach((t, i) => { html = html.replace(`\x00TABLE${i}\x00`, t); });
    codeBlocks.forEach((code, i) => {
      html = html.replace(`\x00CODE${i}\x00`, `<pre class="chat-code-block"><code>${code}</code></pre>`);
    });
    inlineCodes.forEach((code, i) => {
      html = html.replace(`\x00INLINE${i}\x00`, `<code class="chat-inline-code">${code}</code>`);
    });
    linkBlocks.forEach((link, i) => {
      html = html.replace(`\x00LINK${i}\x00`, link);
    });

    const result = this.sanitizer.bypassSecurityTrustHtml('<p>' + html + '</p>');
    this.markdownCache.set(text, result);
    return result;
  }

  private setIsObserver = async () => {
      this.groupService.getGroupsByUser().subscribe(
          res => {
              const user = localStorage.getItem('user');
              const userID = JSON.parse(user)._id;
              this.grups = res;
              this.isObserver = this.grups.filter(group => group.name === 'EDA_RO' && group.users.includes(userID)).length !== 0
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
    /** Obtener etiquetas únicas */
    this.tags = _.uniqBy(
      [...this.allDashboards]
      .flatMap(db => db.config.tag) // Aplanamos los arrays de tags
      .filter(tag => tag !== null && tag !== undefined) // Eliminamos valores nulos o indefinidos
      .flatMap(tag => Array.isArray(tag) ? tag : [tag]) // Si es un array, lo expandimos; si no, lo mantenemos como está
      .map(tag => typeof tag === 'string' ? { label: tag, value: tag } : tag), // Convertimos en objetos { label, value }
      'value' // Eliminamos duplicados basados en el valor
    );

    // Agregar opciones adicionales
    this.tags.unshift({ label: $localize`:@@NoTag:Sin Etiqueta`, value: $localize`:@@NoTag:Sin Etiqueta`, });
    this.tags.push({ label: this.allTagsFlatLabel, value: this.allTagsFlatValue });
    if (this.allDashboards.length >= 20) {
      this.tags.push({ label: this.allTagsGroupedLabel, value: this.allTagsValue });
    }
    this.filterByTags();
  }

  public openReport(report: any, event: MouseEvent) {
    if(this.isEditing){return}
    // Crear la URL completa del informe    
    const urlTree = this.router.createUrlTree(['/dashboard', report._id]);
    const relativeUrl = this.router.serializeUrl(urlTree);

    // Manejar clic medio o Ctrl+clic para abrir en nueva pestaña
    if (event.button === 1 || event.ctrlKey) {
      window.open('#/' + relativeUrl);
      return;
    }

    // Navegar en la misma pestaña
    this.router.navigate(['/dashboard', report._id]);
  }


  public handleTagSelect(option: any): void {
    const currentFilters = this.selectedTags();
    const isSelected = currentFilters.value === option.value;

    if (isSelected) {
      const todoFlatOption = { label: this.allTagsFlatLabel, value: this.allTagsFlatValue };
      this.selectedTags.set(todoFlatOption);
      sessionStorage.setItem("activeTags", JSON.stringify(todoFlatOption));
      this.viewMode.set('flat');
      this.expandedFolder.set(null);
    } else {
      this.selectedTags.set(option);
      sessionStorage.setItem("activeTags", JSON.stringify(option));
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
    return this.tags.filter((option) => option.label.toLowerCase().includes(this.searchTagTerm().toLowerCase()))
  }

  public removeTag(filterToRemove: any): void {
    this.selectedTags.set(this.selectedTags().filter((filter) => filter.value !== filterToRemove.value)); // Elimina del header el tag
    sessionStorage.setItem("activeTags", JSON.stringify((() => {
      const tags = JSON.parse(sessionStorage.getItem("activeTags") || "[]");
      return tags.filter(tag => tag.value !== filterToRemove.value); // Elimina valor del JSON de storage
    })()));
    this.reapplyFilters();
  }

  public toggleDropdownTags(): void {
    this.isOpenTags.set(!this.isOpenTags())
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

  // Esta función actualiza los reports, y es llamada cada vez que se modifican los tags
  public filterByTags() {
    const tags = sessionStorage.getItem("activeTags") || "[]";
    // Si tiene la etiqueta Todos (carpetas o lista plana) o no tiene etiqueta mostraremos todos los informes
    if (tags.includes($localize`:@@AllTags:Todos`) || tags.includes(this.allTagsFlatValue) || tags === '[]') {
      this.publicReports  = this.reportMap.public;
      this.sharedReports  = this.reportMap.shared;
      this.privateReports = this.reportMap.private;
      this.roleReports    = this.reportMap.group;
    // Asignación de reportes visibles
    } else {
      this.publicReports  = this.checkTagsIntoReports(this.reportMap.public, tags);
      this.sharedReports  = this.checkTagsIntoReports(this.reportMap.shared, tags);
      this.privateReports = this.checkTagsIntoReports(this.reportMap.private, tags);
      this.roleReports = this.checkTagsIntoReports(this.reportMap.group, tags);
      }
  }
  
  // Función que devuelve los reports que contienen alguno de los tags del header
  private checkTagsIntoReports(reports, tags) {
    return reports.filter(db => {
        const tag = db.config?.tag;

        // Si no tiene tag y el filtro es "Sin Etiqueta"
        if (tags.includes($localize`:@@NoTag:Sin Etiqueta`)) {
          return tag === null || tag === undefined || tag === '';
        }

        // Si el tag no existe, no mostrar
        if (!tag || tag === '') return false;

        // Normalizar el tag a array de strings
        const tagArray = Array.isArray(tag)
          ? tag.map(t => typeof t === 'string' ? t : t.value || t.label)
          : [typeof tag === 'string' ? tag : tag.value || tag.label];

        // Verificar si alguno de los tags del dashboard está en los filtros seleccionados
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
    // si esta vacio o 1 caracter se muestra todo con filtro de tags
    const raw = (event.target as HTMLInputElement).value?.toString().trim() || '';
    this.applyTitleFilter(raw);
  }

  private applyTitleFilter(raw: string) {
    if (raw.length <= 1) {
      this.filterByTags();
      return;
    }

    const { title, author, datasource, tag, createdFrom, createdTo, modifiedFrom, modifiedTo } = this.parseSearchQuery(raw);

    // funcion de filtrado por keywords que se aplica a cada grupo de infromes
    const filter = (reports: any[]) => reports.filter(db => {
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

    // aplicar filtraje a grupos de informes
    const base = this.getActiveTagBase();
    this.publicReports  = filter(base.public);
    this.sharedReports  = filter(base.shared);
    this.privateReports = filter(base.private);
    this.roleReports    = filter(base.group);
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
    // Obtener la URL actual
    const currentUrl = window.location.href;
    // Eliminar la parte 'home' de la URL si existe i construir la nueva URL apuntando a dashboard/{id}
    const dashboardUrl = `${currentUrl.replace(/\/home\/?$/, '')}/public/${report._id}`;
    // Copiar al portapapeles
    navigator.clipboard.writeText(dashboardUrl).then(() => {
      this.alertService.addSuccess($localize`:@@copyPublicLinkSuccessText:El enlace público ha sido copiado al portapapeles.`);
    });
  }

  // Activar modo edición de un reporte
  renameReport(report: any) {
    //Reseteo de variables
    this.isEditing = true;
    this.editingReportId = report._id;
    this.editTitle = report.config?.title || '';

    //Apartado para añadir focus
    setTimeout(() => {
      const inputElement = document.querySelector<HTMLInputElement>('.edit-title-input');
      if (inputElement) {inputElement.focus();} //Añadir focus si es el elemento seleccionado
    }, 0);
  }

  //Manejar flow de edición
  handleEditing(code: string, report: any) {
    switch (code) {
      case 'done': // Guardar cambios
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
      case 'cancel': // Cancelar y no guardar los cambios
        break;
    }
    // Estado de rename reseteado
    this.isEditing = false;
    this.editingReportId = null;
    this.editTitle = '';
  }

  /**
   * Deletes a report after user confirmation.
   * @param report The report to be deleted
   */
  public deleteReport(report: any): void {
    let text = $localize`:@@deleteDashboardWarning:Estás a punto de borrar el informe:`;
    Swal.fire({
      title: $localize`:@@Sure:¿Estás seguro?`,
      text: `${text} ${report.config.title}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#14B8A6",
      cancelButtonColor: " #ff2802",
      confirmButtonText: $localize`:@@ConfirmDeleteModel:Si, ¡Eliminalo!`,
      cancelButtonText: $localize`:@@cancelarBtn:Cancelar`,
    }).then(deleted => {
      if (deleted.value) {
        this.dashboardService.deleteDashboard(report._id).subscribe(
          () => {
            // Remove the dashboard from allDashboards and visibleDashboards without reordering
            this.allDashboards = this.allDashboards.filter(d => d._id !== report._id);
            
            const targetArray = this.reportMap[report.config.visible];
            if (targetArray) {
              // Find the index of the removed report
              const originalIndex = targetArray.findIndex(d => d._id === report._id);

              if (originalIndex !== -1) {
                // Remove from the list
                targetArray.splice(originalIndex, 1);
              }
            }

            const listNames = ['publicReports', 'privateReports', 'roleReports', 'sharedReports'];

            for (const name of listNames) {
              const list = this[name]; // ahora TypeScript sabe que name es string
              if (list.some(d => d._id === report._id)) {
                this[name] = list.filter(d => d._id !== report._id);
                break; // ya lo eliminamos
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

  /**
 * Clones a report
 * @param report The report to clone
 */
  public cloneReport(report: any): void {
    this.dashboardService.cloneDashboard(report._id).subscribe(
      response => {
        if (response.ok && response.dashboard) {
          // Clonar el informe original
          const clonedReport = _.cloneDeep(report);
          Object.assign(clonedReport, response.dashboard);

          // Ajustar propiedades
          clonedReport.type = clonedReport.config.visible;
          clonedReport.user = this.userService.user.name;

          // Fechas de creación/modificación
          const currentDate = new Date().toISOString().split("T")[0];
          clonedReport.config.createdAt = currentDate;
          clonedReport.config.modifiedAt = currentDate;

          // Autor
          clonedReport.config.author = JSON.parse(localStorage.getItem('user')).name;

          // Insertar en el array correspondiente
          const targetArray = this.reportMap[clonedReport.type];
          if (targetArray) {
            const originalIndex = targetArray.findIndex(d => d._id === report._id);
            if (originalIndex !== -1) {
              targetArray.splice(originalIndex + 1, 0, clonedReport);
            } else {
              targetArray.push(clonedReport);
            }
          }

          // Ordenar informes
          this.handleSorting();

          // Marcar como recién clonado
          clonedReport.isNewlyCloned = true;

          // Scroll automático al nuevo dashboard
          setTimeout(() => {
            const element = document.getElementById(`dashboard-${clonedReport._id}`);
            if (element) {
              element.scrollIntoView({
                behavior: "smooth",
                block: "center"
              });
            }
          }, 500);

          // Quitar marca de nuevo a los 5s
          setTimeout(() => {
            clonedReport.isNewlyCloned = false;
          }, 5000);

          // Alerta de éxito
          this.alertService.addSuccess($localize`:@@REPORTCloned:Informe clonado correctamente`);
        } else {
          throw new Error($localize`:@@InvalidServerResponse:Respuesta inválida del servidor`);
        }
      },
      error => {
        // Alerta de error
        this.alertService.addError($localize`:@@CouldNotCloneReport:No se pudo clonar el informe. Por favor, inténtalo de nuevo.`);
      }
    );
  }




  handleSorting() {
    switch (this.sortingType) {
      case 'dateAsc':
        this.sortingReports('modifiedAt', this.reportMap, 'asc');
        sessionStorage.setItem("homeSorting", "dateAsc");
        break;
      case 'dateDesc':
        this.sortingReports('modifiedAt', this.reportMap, 'desc');
        sessionStorage.setItem("homeSorting", "dateDesc");
        break;
      default:
        this.sortingReports('title', this.reportMap, 'asc');
        sessionStorage.setItem("homeSorting", "name");
        break;
    }
  }

  // Control de visibilidad del panel de filtros avanzados
  ngOnDestroy(): void {
    this.outsideClickSub?.unsubscribe();
  }
  
  // Cerrar panel de filtros si se hace click fuera de él, el calendar o el multiselect
  // Mostrar o ocultar el panel de filtros avanzados
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

  // Aplicar los filtros avanzados a los informes
  applyAdvancedFilters(updateSearchBar = true) {
    //recoger valores de filtros avanzados
    const { author, datasource } = this.advancedFilters;
    const hasCreated  = this.createdRange?.length >= 1 && this.createdRange[0];
    const hasModified = this.modifiedRange?.length >= 1 && this.modifiedRange[0];
    const hasTags     = this.advancedTags.length > 0;
    const hasFilters  = author || datasource || hasCreated || hasModified || hasTags;

    if (!hasFilters) {
      this.filterByTags();
      return;
    }

    // devuelve falso si el informe no cumple alguno de los filtros avanzados
    const filter = (reports: any[]) => reports.filter(db => {
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
    this.publicReports  = filter(base.public);
    this.sharedReports  = filter(base.shared);
    this.privateReports = filter(base.private);
    this.roleReports    = filter(base.group);
    if (updateSearchBar) this.buildSearchQuery();
  }

  // Construye la sintaxis aplicada en los campos de los filtros avanzados y lo pone en el buscador
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

  // Funciones para manejar fechas en filtos avanzados
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

  // Funcion para vaciar el contenido del filtro avanzado
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
      // Si es fecha, convertir a Date
      if (type === 'modifiedAt') {
        const dateA = new Date(valA);
        const dateB = new Date(valB);

        return direction === 'asc'
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      }

      // Por defecto, ordenar strings con localeCompare
      const comparison = valA.localeCompare(valB);
      return direction === 'asc' ? comparison : -comparison;
    };

    this.publicReports = reports.public.sort(compareFn);
    this.privateReports = reports.private.sort(compareFn);
    this.roleReports = reports.group.sort(compareFn);
    this.sharedReports = reports.shared.sort(compareFn);
  }


}
