import { Component, OnInit } from '@angular/core';
import { LogService, AlertService } from '@eda/services/service.index';
import { SpinnerService } from '@eda/services/shared/spinner.service';
/* SDA CUSTOM */ import moment from 'moment';
import { format as formatSqlStatement } from 'sql-formatter';

@Component({
    selector: 'app-logs-sda',
    templateUrl: './logs-sda.component.html',
    styleUrls: ['./logs-sda.component.css']
})
export class LogsSdaComponent implements OnInit {

    public appLogs: any[] = [];
    /* SDA CUSTOM */ public selectedDate: Date | null = new Date();
    /* SDA CUSTOM */ public firstDayOfWeek: number = 1;
    /* SDA CUSTOM */ public calendarLocale: any = {};
    /* SDA CUSTOM */ public minSelectableDate: Date;
    /* SDA CUSTOM */ public maxSelectableDate: Date;
    /* SDA CUSTOM */ public useExactDateFilter: boolean = false;
    /* SDA CUSTOM */ public queryErrorDialogVisible: boolean = false;
    /* SDA CUSTOM */ public selectedQueryError: any = null;
    /* SDA CUSTOM */ public queryErrorCopyStatus: string = '';
    // SDA CUSTOM - Toggle to show/hide frequent DashboardAccessed entries (hidden by default)
    /* SDA CUSTOM */ public showDashboardAccessed: boolean = false;
    // END SDA CUSTOM
    // SDA CUSTOM - i18n-bound properties for runtime-interpolated strings (cannot use inline i18n attributes)
    /* SDA CUSTOM */ public selectPeriodPlaceholder: string = $localize`:@@SelectPeriodPlaceholder:Selecciona periodo`;
    /* SDA CUSTOM */ public showingRecordsTemplate: string;
    /* SDA CUSTOM */ public filterColumnPlaceholder: string = $localize`:@@FilterColumn:Filtro...`;
    /* SDA CUSTOM */ public queryFailureTitle: string = $localize`:@@LogsQueryFailureTitle:Detalles del error de consulta`;
    /* SDA CUSTOM */ public hideDashboardAccessedLabel: string = $localize`:@@HideDashboardAccessed:Mostrar accesos a informes`;
    // END SDA CUSTOM

    public periods: any[] = [
        { label: $localize`:@@Today:Hoy`, value: 'today' },
        { label: $localize`:@@Yesterday:Ayer`, value: 'yesterday' },
        /* SDA CUSTOM */ { label: $localize`:@@Last5Days:Últimos 5 días`, value: 'last5days' },
        /* SDA CUSTOM */ { label: $localize`:@@Last10Days:Últimos 10 días`, value: 'last10days' },
        /* SDA CUSTOM */ // SDA CUSTOM - Removed "This month" and "Custom" periods to keep fixed quick filters only
        /* SDA CUSTOM */ // END SDA CUSTOM
    ];
    /* SDA CUSTOM */ public selectedPeriod: string | null = 'today';

    public cols: any[] = [
        { field: 'date_str', header: $localize`:@@Date:Fecha` },
        { field: 'level', header: $localize`:@@Level:Nivel` },
        { field: 'actionLabel', header: $localize`:@@Action:Acción` },
        { field: 'userMail', header: $localize`:@@User:Usuario` },
        { field: 'ip', header: $localize`:@@IP:IP` },
        { field: 'typeFilterText', header: $localize`:@@Type:Tipo` }
    ];

    constructor(
        private logService: LogService,
        private alertService: AlertService,
        private spinnerService: SpinnerService
    ) {
        /* SDA CUSTOM */ this.maxSelectableDate = moment().endOf('day').toDate();
        /* SDA CUSTOM */ this.minSelectableDate = moment().subtract(9, 'days').startOf('day').toDate();
        /* SDA CUSTOM */ this.calendarLocale = this.resolveCalendarLocaleFromActiveLanguage();
        /* SDA CUSTOM */ this.firstDayOfWeek = this.calendarLocale && this.calendarLocale.firstDayOfWeek !== undefined ? this.calendarLocale.firstDayOfWeek : 1;
        /* SDA CUSTOM */ this.showingRecordsTemplate = this.resolveShowingRecordsTemplate();
    }

    ngOnInit(): void {
        this.loadLogs();
    }

    // SDA CUSTOM - Filter out DashboardAccessed entries when toggle is inactive
    /* SDA CUSTOM */ get filteredLogs(): any[] {
    /* SDA CUSTOM */     if (this.showDashboardAccessed) return this.appLogs;
    /* SDA CUSTOM */     return this.appLogs.filter(log => log?.action !== 'DashboardAccessed');
    /* SDA CUSTOM */ }
    // END SDA CUSTOM

    loadLogs() {
        this.spinnerService.on();

        let params: any = {};

        /* SDA CUSTOM */ if (this.useExactDateFilter) {
        /* SDA CUSTOM */     params.date = moment(this.selectedDate).format('YYYY-MM-DD');
        /* SDA CUSTOM */ } else {
        /* SDA CUSTOM */     const range = this.getPeriodRange(this.selectedPeriod);
        /* SDA CUSTOM */     params.startDate = range.start;
        /* SDA CUSTOM */     params.endDate = range.end;
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ // SDA CUSTOM - Keep limit undefined to fetch full period and avoid truncating 10-day range data
        /* SDA CUSTOM */ // END SDA CUSTOM

        /* SDA CUSTOM */ // SDA CUSTOM - Keep logs viewer focused on application audit log only
        /* SDA CUSTOM */ this.logService.getAppLogs(params).subscribe(
        /* SDA CUSTOM */     (resp: any) => {
        /* SDA CUSTOM */         const sortedLogs = this.sortLogsByDateDesc(resp || []);
        /* SDA CUSTOM */         this.appLogs = this.prepareLogsForTypeColumn(sortedLogs);
        /* SDA CUSTOM */         this.spinnerService.off();
        /* SDA CUSTOM */     },
        /* SDA CUSTOM */     (err) => {
        /* SDA CUSTOM */         this.alertService.addError(err);
        /* SDA CUSTOM */         this.spinnerService.off();
        /* SDA CUSTOM */     }
        /* SDA CUSTOM */ );
        /* SDA CUSTOM */ // END SDA CUSTOM
    }

    /* SDA CUSTOM */ getPeriodRange(period: string | null): { start: string, end: string } {
        const today = moment();
        let start = moment();
        let end = moment();

        /* SDA CUSTOM */ if (!period) {
        /* SDA CUSTOM */     period = 'today';
        /* SDA CUSTOM */ }

        switch (period) {
            case 'today':
                start = today;
                end = today;
                break;
            case 'yesterday':
                start = moment().subtract(1, 'days');
                end = start;
                break;
            /* SDA CUSTOM */ case 'last5days':
                /* SDA CUSTOM */ start = moment().subtract(4, 'days');
                end = today;
                break;
            /* SDA CUSTOM */ case 'last10days':
                /* SDA CUSTOM */ start = moment().subtract(9, 'days');
                end = today;
                break;
        }

        return {
            start: start.format('YYYY-MM-DD'),
            end: end.format('YYYY-MM-DD')
        };
    }

    onPeriodChange() {
        /* SDA CUSTOM */ // SDA CUSTOM - With only fixed periods, always reload on selection change
        /* SDA CUSTOM */ // END SDA CUSTOM
        /* SDA CUSTOM */ if (!this.selectedPeriod) {
        /* SDA CUSTOM */     return;
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ // SDA CUSTOM - Clear date picker only for multi-day periods; keep visible date for single-day periods
        /* SDA CUSTOM */ const range = this.getPeriodRange(this.selectedPeriod);
        /* SDA CUSTOM */ if (range.start === range.end) {
        /* SDA CUSTOM */     this.selectedDate = moment(range.start, 'YYYY-MM-DD').toDate();
        /* SDA CUSTOM */ } else {
        /* SDA CUSTOM */     this.selectedDate = null;
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ // END SDA CUSTOM
        /* SDA CUSTOM */ this.useExactDateFilter = false;
        this.loadLogs();
    }

    /* SDA CUSTOM */ // SDA CUSTOM - Enable exact-date mode when a day is selected in calendar (restricted to last 10 days)
    /* SDA CUSTOM */ onDateChange() {
    /* SDA CUSTOM */     const selectedMoment = moment(this.selectedDate);
    /* SDA CUSTOM */     const minMoment = moment(this.minSelectableDate);
    /* SDA CUSTOM */     const maxMoment = moment(this.maxSelectableDate);
    /* SDA CUSTOM */     const todayMoment = moment().startOf('day');
    /* SDA CUSTOM */     const yesterdayMoment = moment().subtract(1, 'day').startOf('day');
    /* SDA CUSTOM */
    /* SDA CUSTOM */     if (selectedMoment.isBefore(minMoment, 'day')) {
    /* SDA CUSTOM */         this.selectedDate = minMoment.toDate();
    /* SDA CUSTOM */     } else if (selectedMoment.isAfter(maxMoment, 'day')) {
    /* SDA CUSTOM */         this.selectedDate = maxMoment.toDate();
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */
    /* SDA CUSTOM */     const normalizedSelected = moment(this.selectedDate).startOf('day');
    /* SDA CUSTOM */     if (normalizedSelected.isSame(todayMoment, 'day')) {
    /* SDA CUSTOM */         this.selectedPeriod = 'today';
    /* SDA CUSTOM */         this.useExactDateFilter = false;
    /* SDA CUSTOM */     } else if (normalizedSelected.isSame(yesterdayMoment, 'day')) {
    /* SDA CUSTOM */         this.selectedPeriod = 'yesterday';
    /* SDA CUSTOM */         this.useExactDateFilter = false;
    /* SDA CUSTOM */     } else {
    /* SDA CUSTOM */         this.selectedPeriod = null;
    /* SDA CUSTOM */         this.useExactDateFilter = true;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     this.loadLogs();
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Use active app language from URL (not browser locale) with english fallback
    /* SDA CUSTOM */ private resolveCalendarLocaleFromActiveLanguage() {
    /* SDA CUSTOM */     const url = window.location.href;
    /* SDA CUSTOM */     const lanCa = /\/ca\//i;
    /* SDA CUSTOM */     const lanEs = /\/es\//i;
    /* SDA CUSTOM */     const lanGl = /\/gl\//i;
    /* SDA CUSTOM */
    /* SDA CUSTOM */     const localesByLanguage = {
    /* SDA CUSTOM */         es: {
    /* SDA CUSTOM */             firstDayOfWeek: 1,
    /* SDA CUSTOM */             dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    /* SDA CUSTOM */             dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'],
    /* SDA CUSTOM */             dayNamesMin: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'],
    /* SDA CUSTOM */             monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    /* SDA CUSTOM */             monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    /* SDA CUSTOM */             today: 'Hoy',
    /* SDA CUSTOM */             clear: 'Limpiar',
    /* SDA CUSTOM */             weekHeader: 'Semana'
    /* SDA CUSTOM */         },
    /* SDA CUSTOM */         ca: {
    /* SDA CUSTOM */             firstDayOfWeek: 1,
    /* SDA CUSTOM */             dayNames: ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'],
    /* SDA CUSTOM */             dayNamesShort: ['Dg', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds'],
    /* SDA CUSTOM */             dayNamesMin: ['Dg', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds'],
    /* SDA CUSTOM */             monthNames: ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'],
    /* SDA CUSTOM */             monthNamesShort: ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'],
    /* SDA CUSTOM */             today: 'Avui',
    /* SDA CUSTOM */             clear: 'Netejar',
    /* SDA CUSTOM */             weekHeader: 'Setmana'
    /* SDA CUSTOM */         },
    /* SDA CUSTOM */         en: {
    /* SDA CUSTOM */             firstDayOfWeek: 1,
    /* SDA CUSTOM */             dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    /* SDA CUSTOM */             dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    /* SDA CUSTOM */             dayNamesMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    /* SDA CUSTOM */             monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    /* SDA CUSTOM */             monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    /* SDA CUSTOM */             today: 'Today',
    /* SDA CUSTOM */             clear: 'Clear',
    /* SDA CUSTOM */             weekHeader: 'Wk'
    /* SDA CUSTOM */         }
    /* SDA CUSTOM */     };
    /* SDA CUSTOM */
    /* SDA CUSTOM */     if (lanCa.test(url)) return localesByLanguage.ca;
    /* SDA CUSTOM */     if (lanEs.test(url)) return localesByLanguage.es;
    /* SDA CUSTOM */     return localesByLanguage.en;
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Build paginator report template based on active language
    /* SDA CUSTOM */ private resolveShowingRecordsTemplate(): string {
    /* SDA CUSTOM */     const url = window.location.href;
    /* SDA CUSTOM */     const lanCa = /\/ca\//i;
    /* SDA CUSTOM */     const lanEn = /\/en\//i;
    /* SDA CUSTOM */     const lanGl = /\/gl\//i;
    /* SDA CUSTOM */     if (lanCa.test(url)) return 'Mostrant {first} a {last} de {totalRecords} registres';
    /* SDA CUSTOM */     if (lanGl.test(url)) return 'Mostrando {first} a {last} de {totalRecords} rexistros';
    /* SDA CUSTOM */     if (lanEn.test(url)) return 'Showing {first} to {last} of {totalRecords} records';
    /* SDA CUSTOM */     return 'Mostrando {first} a {last} de {totalRecords} registros';
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Parse log date format YYYY-MM-DD H:m:s safely (with or without zero padding)
    /* SDA CUSTOM */ private parseLogDateToTimestamp(dateStr: string): number {
    /* SDA CUSTOM */     if (!dateStr || typeof dateStr !== 'string') return 0;
    /* SDA CUSTOM */     const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
    /* SDA CUSTOM */     if (!match) return 0;
    /* SDA CUSTOM */     const year = Number(match[1]);
    /* SDA CUSTOM */     const month = Number(match[2]) - 1;
    /* SDA CUSTOM */     const day = Number(match[3]);
    /* SDA CUSTOM */     const hour = Number(match[4]);
    /* SDA CUSTOM */     const minute = Number(match[5]);
    /* SDA CUSTOM */     const second = Number(match[6]);
    /* SDA CUSTOM */     return new Date(year, month, day, hour, minute, second).getTime();
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Format date string with leading zeros for HH:mm:ss in UI
    /* SDA CUSTOM */ formatDateForDisplay(dateStr: string): string {
    /* SDA CUSTOM */     if (!dateStr || typeof dateStr !== 'string') return dateStr;
    /* SDA CUSTOM */     const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
    /* SDA CUSTOM */     if (!match) return dateStr;
    /* SDA CUSTOM */     const hour = String(Number(match[4])).padStart(2, '0');
    /* SDA CUSTOM */     const minute = String(Number(match[5])).padStart(2, '0');
    /* SDA CUSTOM */     const second = String(Number(match[6])).padStart(2, '0');
    /* SDA CUSTOM */     return `${match[1]}-${match[2]}-${match[3]} ${hour}:${minute}:${second}`;
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Sort logs descending by real timestamp for correct chronological order
    /* SDA CUSTOM */ private sortLogsByDateDesc(logs: any[]): any[] {
    /* SDA CUSTOM */     return [...logs].sort((a, b) => this.parseLogDateToTimestamp(b?.date_str) - this.parseLogDateToTimestamp(a?.date_str));
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - PrimeNG custom sort to avoid lexicographical sorting for date_str
    /* SDA CUSTOM */ onTableSort(event: any) {
    /* SDA CUSTOM */     const field = event?.field;
    /* SDA CUSTOM */     const order = event?.order || 1;
    /* SDA CUSTOM */     if (field !== 'date_str') {
    /* SDA CUSTOM */         const data = event?.data || [];
    /* SDA CUSTOM */         data.sort((a, b) => {
    /* SDA CUSTOM */             const first = (a?.[field] ?? '').toString().toLowerCase();
    /* SDA CUSTOM */             const second = (b?.[field] ?? '').toString().toLowerCase();
    /* SDA CUSTOM */             if (first < second) return -1 * order;
    /* SDA CUSTOM */             if (first > second) return 1 * order;
    /* SDA CUSTOM */             return 0;
    /* SDA CUSTOM */         });
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     const data = event?.data || [];
    /* SDA CUSTOM */     data.sort((a, b) => (this.parseLogDateToTimestamp(a?.date_str) - this.parseLogDateToTimestamp(b?.date_str)) * order);
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Build friendly metadata for type column (operation first + dashboard link)
    /* SDA CUSTOM */ private prepareLogsForTypeColumn(logs: any[]): any[] {
    /* SDA CUSTOM */     return logs.map(log => {
    /* SDA CUSTOM */         const parsedType = this.parseDashboardType(log?.type);
    /* SDA CUSTOM */         const parsedQueryFailure = this.parsePanelQueryFailureDetail(parsedType?.detail);
    /* SDA CUSTOM */         const operationLabel = this.getOperationLabel(log?.action, parsedType?.detail);
    /* SDA CUSTOM */         const actionLabel = this.getActionLabel(log?.action);
    /* SDA CUSTOM */         const canLinkDashboard = this.isDashboardAction(log?.action) && !!parsedType?.dashboardId && log?.action !== 'DashboardDeleted';
    /* SDA CUSTOM */         const showDetail = (log?.action === 'DashboardDeleted' || log?.action === 'UserDeleted') && !!parsedType?.detail;
    /* SDA CUSTOM */         const typeFilterText = `${operationLabel} ${parsedType?.dashboardTitle || ''} ${showDetail ? parsedType.detail : ''}`.trim();
    /* SDA CUSTOM */         return {
    /* SDA CUSTOM */             ...log,
    /* SDA CUSTOM */             actionLabel: actionLabel,
    /* SDA CUSTOM */             typeOperationLabel: operationLabel,
    /* SDA CUSTOM */             typeDashboardId: parsedType?.dashboardId || '',
    /* SDA CUSTOM */             typeDashboardTitle: parsedType?.dashboardTitle || '',
    /* SDA CUSTOM */             typeDetail: showDetail ? parsedType.detail : '',
    /* SDA CUSTOM */             typeCanLinkDashboard: canLinkDashboard,
    /* SDA CUSTOM */             typeFilterText: typeFilterText,
    /* SDA CUSTOM */             typePanelId: parsedQueryFailure.panel,
    /* SDA CUSTOM */             typePanelName: parsedQueryFailure.panelName,
    /* SDA CUSTOM */             typeQueryMode: parsedQueryFailure.mode,
    /* SDA CUSTOM */             typeQueryError: parsedQueryFailure.error,
    /* SDA CUSTOM */             typeQuerySqlB64: parsedQueryFailure.sqlB64,
    /* SDA CUSTOM */             typeQuerySql: parsedQueryFailure.sql
    /* SDA CUSTOM */         };
    /* SDA CUSTOM */     });
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Parse PanelQueryFailed detail payload into fields for popup
    /* SDA CUSTOM */ private parsePanelQueryFailureDetail(detail: string): any {
    /* SDA CUSTOM */     const raw = (detail || '').toString();
    /* SDA CUSTOM */     const mode = this.extractDetailSegment(raw, 'mode:', '--panel:');
    /* SDA CUSTOM */     let panel = this.extractDetailSegment(raw, '--panel:', '--panel_name:');
    /* SDA CUSTOM */     let panelName = this.extractDetailSegment(raw, '--panel_name:', '--error:');
    /* SDA CUSTOM */     if (!panel) panel = this.extractDetailSegment(raw, '--panel:', '--error:');
    /* SDA CUSTOM */     if (!panelName) panelName = '-';
    /* SDA CUSTOM */     const sqlB64 = this.extractDetailSegment(raw, '--sql_b64:', '--sql:');
    /* SDA CUSTOM */     const error = this.extractDetailSegment(raw, '--error:', '--sql:');
    /* SDA CUSTOM */     const sql = this.extractDetailSegment(raw, '--sql:', '');
    /* SDA CUSTOM */     return { mode, panel, panelName, error, sqlB64, sql };
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Generic extractor for keyed segments in type detail payload
    /* SDA CUSTOM */ private extractDetailSegment(value: string, startToken: string, endToken: string): string {
    /* SDA CUSTOM */     const startIndex = value.indexOf(startToken);
    /* SDA CUSTOM */     if (startIndex < 0) return '';
    /* SDA CUSTOM */     const from = startIndex + startToken.length;
    /* SDA CUSTOM */     if (!endToken) return value.substring(from).trim();
    /* SDA CUSTOM */     const endIndex = value.indexOf(endToken, from);
    /* SDA CUSTOM */     if (endIndex < 0) return value.substring(from).trim();
    /* SDA CUSTOM */     return value.substring(from, endIndex).trim();
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Open popup with detailed information for failed panel query
    /* SDA CUSTOM */ openQueryErrorDialog(rowData: any) {
    /* SDA CUSTOM */     this.queryErrorCopyStatus = '';
    /* SDA CUSTOM */     this.selectedQueryError = {
    /* SDA CUSTOM */         reportName: rowData?.typeDashboardTitle || '-',
    /* SDA CUSTOM */         reportId: rowData?.typeDashboardId || '-',
    /* SDA CUSTOM */         panelName: rowData?.typePanelName || '-',
    /* SDA CUSTOM */         panelId: rowData?.typePanelId || '-',
    /* SDA CUSTOM */         mode: rowData?.typeQueryMode || '-',
    /* SDA CUSTOM */         error: rowData?.typeQueryError || '-',
    /* SDA CUSTOM */         sql: this.formatSqlForDisplay(this.getRawSqlFromLog(rowData))
    /* SDA CUSTOM */     };
    /* SDA CUSTOM */     this.queryErrorDialogVisible = true;
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Copy SQL to clipboard with fallback for older browsers
    /* SDA CUSTOM */ async copyQuerySqlToClipboard() {
    /* SDA CUSTOM */     const sql = (this.selectedQueryError && this.selectedQueryError.sql) ? this.selectedQueryError.sql.toString() : '';
    /* SDA CUSTOM */     if (!sql || sql === '-') {
    /* SDA CUSTOM */         this.queryErrorCopyStatus = $localize`:@@LogsSqlNotAvailable:SQL no disponible`;
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     try {
    /* SDA CUSTOM */         if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
    /* SDA CUSTOM */             await navigator.clipboard.writeText(sql);
    /* SDA CUSTOM */             this.queryErrorCopyStatus = $localize`:@@LogsSqlCopied:SQL copiado`;
    /* SDA CUSTOM */             return;
    /* SDA CUSTOM */         }
    /* SDA CUSTOM */     } catch (e) {
    /* SDA CUSTOM */         // continue to legacy fallback
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     const textArea = document.createElement('textarea');
    /* SDA CUSTOM */     textArea.value = sql;
    /* SDA CUSTOM */     textArea.style.position = 'fixed';
    /* SDA CUSTOM */     textArea.style.opacity = '0';
    /* SDA CUSTOM */     document.body.appendChild(textArea);
    /* SDA CUSTOM */     textArea.focus();
    /* SDA CUSTOM */     textArea.select();
    /* SDA CUSTOM */     try {
    /* SDA CUSTOM */         document.execCommand('copy');
    /* SDA CUSTOM */         this.queryErrorCopyStatus = $localize`:@@LogsSqlCopied:SQL copiado`;
    /* SDA CUSTOM */     } catch (e) {
    /* SDA CUSTOM */         this.queryErrorCopyStatus = $localize`:@@LogsCopyFailed:Error al copiar`;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     document.body.removeChild(textArea);
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Get raw SQL preferring sql_b64 payload when available
    /* SDA CUSTOM */ private getRawSqlFromLog(rowData: any): string {
    /* SDA CUSTOM */     const encoded = rowData?.typeQuerySqlB64 || '';
    /* SDA CUSTOM */     if (encoded) {
    /* SDA CUSTOM */         const decoded = this.decodeBase64Utf8(encoded);
    /* SDA CUSTOM */         if (decoded) return decoded;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     return rowData?.typeQuerySql || '';
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Decode base64 text safely (UTF-8)
    /* SDA CUSTOM */ private decodeBase64Utf8(encoded: string): string {
    /* SDA CUSTOM */     try {
    /* SDA CUSTOM */         const binary = atob(encoded);
    /* SDA CUSTOM */         const escaped = Array.prototype.map.call(binary, (char: string) => {
    /* SDA CUSTOM */             return '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2);
    /* SDA CUSTOM */         }).join('');
    /* SDA CUSTOM */         return decodeURIComponent(escaped);
    /* SDA CUSTOM */     } catch (e) {
    /* SDA CUSTOM */         return '';
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Lightweight SQL formatter for popup readability
    /* SDA CUSTOM */ private formatSqlForDisplay(sql: string): string {
    /* SDA CUSTOM */     if (!sql) return '-';
    /* SDA CUSTOM */     try {
    /* SDA CUSTOM */         return formatSqlStatement(sql, { language: 'sql' });
    /* SDA CUSTOM */     } catch (e) {
    /* SDA CUSTOM */         return sql;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Parse dashboard payload from type field format: id--title--detail
    /* SDA CUSTOM */ private parseDashboardType(typeValue: string): any {
    /* SDA CUSTOM */     const typeText = (typeValue || '').toString();
    /* SDA CUSTOM */     const parts = typeText.split('--');
    /* SDA CUSTOM */     return {
    /* SDA CUSTOM */         dashboardId: parts[0] || '',
    /* SDA CUSTOM */         dashboardTitle: parts[1] || '',
    /* SDA CUSTOM */         detail: parts.slice(2).join('--') || ''
    /* SDA CUSTOM */     };
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Identify actions related to dashboard operations
    /* SDA CUSTOM */ private isDashboardAction(action: string): boolean {
    /* SDA CUSTOM */     return ['DashboardAccessed', 'DashboardCreated', 'DashboardUpdated', 'DashboardRenamed', 'DashboardVisibilityChanged', 'DashboardDeleted', 'PanelQueryFailed'].includes(action);
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Translate raw action key for the Action column
    /* SDA CUSTOM */ private getActionLabel(action: string): string {
    /* SDA CUSTOM */     const labels = {
    /* SDA CUSTOM */         newLogin: $localize`:@@LogsActionNewLogin:Login`,
    /* SDA CUSTOM */         DashboardAccessed: $localize`:@@LogsActionDashboardAccessed:Acceso a informe`,
    /* SDA CUSTOM */         DashboardCreated: $localize`:@@LogsActionDashboardCreated:Informe creado`,
    /* SDA CUSTOM */         DashboardUpdated: $localize`:@@LogsActionDashboardUpdated:Informe actualizado`,
    /* SDA CUSTOM */         DashboardRenamed: $localize`:@@LogsActionDashboardRenamed:Informe renombrado`,
    /* SDA CUSTOM */         DashboardVisibilityChanged: $localize`:@@LogsActionDashboardVisibilityChanged:Visibilidad del informe cambiada`,
    /* SDA CUSTOM */         DashboardDeleted: $localize`:@@LogsActionDashboardDeleted:Informe eliminado`,
    /* SDA CUSTOM */         PanelQueryFailed: $localize`:@@LogsActionPanelQueryFailed:Consulta del panel fallida`,
    /* SDA CUSTOM */         UserCreated: $localize`:@@LogsActionUserCreated:Usuario creado`,
    /* SDA CUSTOM */         UserUpdated: $localize`:@@LogsActionUserUpdated:Usuario actualizado`,
    /* SDA CUSTOM */         UserDeleted: $localize`:@@LogsActionUserDeleted:Usuario eliminado`,
    /* SDA CUSTOM */         UserRolesChanged: $localize`:@@LogsActionUserRolesChanged:Roles de usuario cambiados`,
    /* SDA CUSTOM */         UserPasswordChanged: $localize`:@@LogsActionUserPasswordChanged:Contraseña de usuario cambiada`,
    /* SDA CUSTOM */         GroupCreated: $localize`:@@LogsActionGroupCreated:Grupo creado`,
    /* SDA CUSTOM */         GroupUpdated: $localize`:@@LogsActionGroupUpdated:Grupo actualizado`,
    /* SDA CUSTOM */         GroupDeleted: $localize`:@@LogsActionGroupDeleted:Grupo eliminado`,
    /* SDA CUSTOM */         GroupMembershipChanged: $localize`:@@LogsActionGroupMembershipChanged:Membresía de grupo cambiada`,
    /* SDA CUSTOM */         UpdateModelStarted: $localize`:@@LogsActionUpdateModelStarted:Actualización del modelo iniciada`,
    /* SDA CUSTOM */         UpdateModelUsersAndGroupsSynced: $localize`:@@LogsActionUpdateModelUsersAndGroupsSynced:Usuarios/Grupos sincronizados`,
    /* SDA CUSTOM */         UpdateModelUsersAndGroupsSyncFailed: $localize`:@@LogsActionUpdateModelUsersAndGroupsSyncFailed:Fallo en sincronización de Usuarios/Grupos`,
    /* SDA CUSTOM */         UpdateModelRolesMapped: $localize`:@@LogsActionUpdateModelRolesMapped:Roles mapeados`,
    /* SDA CUSTOM */         UpdateModelRolesMappingFailed: $localize`:@@LogsActionUpdateModelRolesMappingFailed:Fallo en mapeo de roles`,
    /* SDA CUSTOM */         UpdateModelDataModelBuilt: $localize`:@@LogsActionUpdateModelDataModelBuilt:Modelo de datos construido`,
    /* SDA CUSTOM */         UpdateModelDataModelBuildFailed: $localize`:@@LogsActionUpdateModelDataModelBuildFailed:Fallo en construcción del modelo de datos`,
    /* SDA CUSTOM */         UpdateModelCompleted: $localize`:@@LogsActionUpdateModelCompleted:Actualización del modelo completada`,
    /* SDA CUSTOM */         UpdateModelPushFailed: $localize`:@@LogsActionUpdateModelPushFailed:Fallo en push del modelo`,
    /* SDA CUSTOM */         UpdateModelFailed: $localize`:@@LogsActionUpdateModelFailed:Fallo en actualización del modelo`
    /* SDA CUSTOM */     };
    /* SDA CUSTOM */     return labels[action] || action || '-';
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Convert action/detail to user-friendly operation label for type column
    /* SDA CUSTOM */ private getOperationLabel(action: string, detail: string): string {
    /* SDA CUSTOM */     const actionLabels = {
    /* SDA CUSTOM */         DashboardAccessed: $localize`:@@LogsActionAccess:Acceso`,
    /* SDA CUSTOM */         DashboardCreated: $localize`:@@LogsActionCreation:Creación`,
    /* SDA CUSTOM */         DashboardUpdated: $localize`:@@LogsActionUpdate:Actualización`,
    /* SDA CUSTOM */         DashboardRenamed: $localize`:@@LogsActionRename:Renombrado`,
    /* SDA CUSTOM */         DashboardVisibilityChanged: $localize`:@@LogsActionVisibilityChange:Cambio de visibilidad`,
    /* SDA CUSTOM */         DashboardDeleted: $localize`:@@LogsActionDeletion:Eliminación`,
    /* SDA CUSTOM */         PanelQueryFailed: $localize`:@@LogsActionQueryFailure:Fallo de consulta`,
    /* SDA CUSTOM */         UserCreated: $localize`:@@LogsActionUserCreation:Creación de usuario`,
    /* SDA CUSTOM */         UserUpdated: $localize`:@@LogsActionUserUpdate:Actualización de usuario`,
    /* SDA CUSTOM */         UserDeleted: $localize`:@@LogsActionUserDeletion:Eliminación de usuario`,
    /* SDA CUSTOM */         UserRolesChanged: $localize`:@@LogsActionUserRolesChange:Cambio de roles de usuario`,
    /* SDA CUSTOM */         UserPasswordChanged: $localize`:@@LogsActionUserPasswordChange:Cambio de contraseña de usuario`,
    /* SDA CUSTOM */         GroupCreated: $localize`:@@LogsActionGroupCreation:Creación de grupo`,
    /* SDA CUSTOM */         GroupUpdated: $localize`:@@LogsActionGroupUpdate:Actualización de grupo`,
    /* SDA CUSTOM */         GroupDeleted: $localize`:@@LogsActionGroupDeletion:Eliminación de grupo`,
    /* SDA CUSTOM */         GroupMembershipChanged: $localize`:@@LogsActionGroupMembershipChange:Cambio de membresía de grupo`,
    /* SDA CUSTOM */         UpdateModelStarted: $localize`:@@LogsActionModelUpdateStart:Inicio de actualización del modelo`,
    /* SDA CUSTOM */         UpdateModelUsersAndGroupsSynced: $localize`:@@LogsActionUsersGroupsSync:Sincronización de usuarios/grupos`,
    /* SDA CUSTOM */         UpdateModelUsersAndGroupsSyncFailed: $localize`:@@LogsActionUsersGroupsSyncFailure:Fallo en sincronización de usuarios/grupos`,
    /* SDA CUSTOM */         UpdateModelRolesMapped: $localize`:@@LogsActionRoleMapping:Mapeo de roles`,
    /* SDA CUSTOM */         UpdateModelRolesMappingFailed: $localize`:@@LogsActionRoleMappingFailure:Fallo en mapeo de roles`,
    /* SDA CUSTOM */         UpdateModelDataModelBuilt: $localize`:@@LogsActionDataModelBuild:Construcción del modelo de datos`,
    /* SDA CUSTOM */         UpdateModelDataModelBuildFailed: $localize`:@@LogsActionDataModelBuildFailure:Fallo en construcción del modelo de datos`,
    /* SDA CUSTOM */         UpdateModelCompleted: $localize`:@@LogsActionModelUpdateCompleted:Actualización del modelo completada`,
    /* SDA CUSTOM */         UpdateModelPushFailed: $localize`:@@LogsActionModelPushFailure:Fallo en push del modelo`,
    /* SDA CUSTOM */         UpdateModelFailed: $localize`:@@LogsActionModelUpdateFailure:Fallo en actualización del modelo`
    /* SDA CUSTOM */     };
    /* SDA CUSTOM */     if (actionLabels[action]) return actionLabels[action];
    /* SDA CUSTOM */     if (detail === 'attempt') return $localize`:@@LogsActionAttempt:Intento`;
    /* SDA CUSTOM */     if (detail === 'login') return $localize`:@@LogsActionLogin:Inicio de sesión`;
    /* SDA CUSTOM */     return detail || '-';
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

}
