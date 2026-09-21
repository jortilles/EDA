import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { InputSwitchModule } from 'primeng/inputswitch';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { format as formatSqlStatement } from 'sql-formatter';
import { LogService, AlertService } from '@eda/services/service.index';
import { SpinnerService } from '@eda/services/shared/spinner.service';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { LogPeriodFilterComponent, LogDateRangeChange } from '../log-period-filter/log-period-filter.component';

@Component({
    standalone: true,
    selector: 'app-audit-log',
    templateUrl: './audit-log.component.html',
    styleUrls: ['./audit-log.component.css'],
    imports: [
        CommonModule, FormsModule, RouterModule,
        InputSwitchModule, DialogModule, DropdownModule, IconComponent,
        LogPeriodFilterComponent
    ]
})
export class AuditLogComponent {

    public appLogs: any[] = [];
    public queryErrorDialogVisible: boolean = false;
    public selectedQueryError: any = null;
    public queryErrorCopyStatus: string = '';
    // Hidden by default: DashboardAccessed is by far the most frequent action and drowns out the rest
    public showDashboardAccessed: boolean = false;

    // Runtime-interpolated i18n strings (can't use inline i18n attributes for these)
    public searchPlaceholder: string = $localize`:@@FilterColumn:Buscar...`;
    public queryFailureTitle: string = $localize`:@@LogsQueryFailureTitle:Detalles del error de consulta`;
    public hideDashboardAccessedLabel: string = $localize`:@@HideDashboardAccessed:Mostrar accesos a informes`;

    public cols: any[] = [
        { field: 'date_str', header: $localize`:@@Date:Fecha` },
        { field: 'level', header: $localize`:@@Level:Nivel` },
        { field: 'actionLabel', header: $localize`:@@Action:Acción` },
        { field: 'userMail', header: $localize`:@@User:Usuario` },
        { field: 'ip', header: $localize`:@@IP:IP` },
        { field: 'typeFilterText', header: $localize`:@@Type:Tipo` }
    ];

    // Table search / sort / pagination (native table, same pattern as user-list/group-list)
    public searchTerm: string = '';
    public columnFilters: { [field: string]: string } = {};
    public sortConfig: { field: string, direction: 'asc' | 'desc' } | null = { field: 'date_str', direction: 'desc' };
    public currentPage: number = 1;
    public itemsPerPage: number = 20;
    public readonly pageSizeOptions = [10, 20, 50, 100, 500];

    constructor(
        private logService: LogService,
        private alertService: AlertService,
        private spinnerService: SpinnerService
    ) { }

    get baseLogs(): any[] {
        if (this.showDashboardAccessed) return this.appLogs;
        return this.appLogs.filter(log => log?.action !== 'DashboardAccessed');
    }

    get columnFilteredLogs(): any[] {
        const activeFilters = Object.entries(this.columnFilters).filter(([, value]) => !!value?.trim());
        if (activeFilters.length === 0) return this.baseLogs;
        return this.baseLogs.filter(log =>
            activeFilters.every(([field, value]) => (log?.[field] || '').toString().toLowerCase().includes(value.trim().toLowerCase()))
        );
    }

    get searchedLogs(): any[] {
        const term = this.searchTerm.trim().toLowerCase();
        if (!term) return this.columnFilteredLogs;
        return this.columnFilteredLogs.filter(log =>
            ['date_str', 'level', 'actionLabel', 'userMail', 'ip', 'typeFilterText']
                .some(field => (log?.[field] || '').toString().toLowerCase().includes(term))
        );
    }

    get sortedLogs(): any[] {
        if (!this.sortConfig) return this.searchedLogs;
        const { field, direction } = this.sortConfig;
        const order = direction === 'asc' ? 1 : -1;
        return [...this.searchedLogs].sort((a, b) => {
            if (field === 'date_str') {
                return (this.parseLogDateToTimestamp(a?.date_str) - this.parseLogDateToTimestamp(b?.date_str)) * order;
            }
            const first = (a?.[field] ?? '').toString().toLowerCase();
            const second = (b?.[field] ?? '').toString().toLowerCase();
            if (first < second) return -1 * order;
            if (first > second) return 1 * order;
            return 0;
        });
    }

    get paginatedLogs(): any[] {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        return this.sortedLogs.slice(start, start + this.itemsPerPage);
    }

    get pageNumbers(): number[] {
        return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
    }

    totalPages(): number {
        return Math.max(1, Math.ceil(this.sortedLogs.length / this.itemsPerPage));
    }

    setPage(page: number) {
        this.currentPage = page;
    }

    onSearchChange() {
        this.currentPage = 1;
    }

    onColumnFilterChange() {
        this.currentPage = 1;
    }

    onShowDashboardAccessedChange() {
        this.currentPage = 1;
    }

    handleSort(field: string) {
        this.sortConfig = this.sortConfig?.field === field && this.sortConfig.direction === 'asc'
            ? { field, direction: 'desc' }
            : { field, direction: 'asc' };
    }

    onDateRangeChange(change: LogDateRangeChange) {
        this.currentPage = 1;
        this.spinnerService.on();

        const params: any = change.useExactDate
            ? { date: change.date }
            : { startDate: change.startDate, endDate: change.endDate };
        // limit stays undefined to fetch the full period and avoid truncating a 10-day range

        this.logService.getAppLogs(params).subscribe(
            (resp: any) => {
                const sortedLogs = this.sortLogsByDateDesc(resp || []);
                this.appLogs = this.prepareLogsForTypeColumn(sortedLogs);
                this.spinnerService.off();
            },
            (err) => {
                this.alertService.addError(err);
                this.spinnerService.off();
            }
        );
    }

    // Backend date format is YYYY-MM-DD H:m:s, not zero-padded — parse tolerantly
    private parseLogDateToTimestamp(dateStr: string): number {
        if (!dateStr || typeof dateStr !== 'string') return 0;
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
        if (!match) return 0;
        const year = Number(match[1]);
        const month = Number(match[2]) - 1;
        const day = Number(match[3]);
        const hour = Number(match[4]);
        const minute = Number(match[5]);
        const second = Number(match[6]);
        return new Date(year, month, day, hour, minute, second).getTime();
    }

    formatDateForDisplay(dateStr: string): string {
        if (!dateStr || typeof dateStr !== 'string') return dateStr;
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
        if (!match) return dateStr;
        const hour = String(Number(match[4])).padStart(2, '0');
        const minute = String(Number(match[5])).padStart(2, '0');
        const second = String(Number(match[6])).padStart(2, '0');
        return `${match[1]}-${match[2]}-${match[3]} ${hour}:${minute}:${second}`;
    }

    private sortLogsByDateDesc(logs: any[]): any[] {
        return [...logs].sort((a, b) => this.parseLogDateToTimestamp(b?.date_str) - this.parseLogDateToTimestamp(a?.date_str));
    }

    private prepareLogsForTypeColumn(logs: any[]): any[] {
        return logs.map(log => {
            const parsedType = this.parseDashboardType(log?.type);
            const parsedQueryFailure = this.parsePanelQueryFailureDetail(parsedType?.detail);
            const operationLabel = this.getOperationLabel(log?.action, parsedType?.detail);
            const actionLabel = this.getActionLabel(log?.action);
            const canLinkDashboard = this.isDashboardAction(log?.action) && !!parsedType?.dashboardId && log?.action !== 'DashboardDeleted';
            const showDetail = (log?.action === 'DashboardDeleted' || log?.action === 'UserDeleted') && !!parsedType?.detail;
            const typeFilterText = `${operationLabel} ${parsedType?.dashboardTitle || ''} ${showDetail ? parsedType.detail : ''}`.trim();
            return {
                ...log,
                actionLabel: actionLabel,
                typeOperationLabel: operationLabel,
                typeDashboardId: parsedType?.dashboardId || '',
                typeDashboardTitle: parsedType?.dashboardTitle || '',
                typeDetail: showDetail ? parsedType.detail : '',
                typeCanLinkDashboard: canLinkDashboard,
                typeFilterText: typeFilterText,
                typePanelId: parsedQueryFailure.panel,
                typePanelName: parsedQueryFailure.panelName,
                typeQueryMode: parsedQueryFailure.mode,
                typeQueryError: parsedQueryFailure.error,
                typeQuerySqlB64: parsedQueryFailure.sqlB64,
                typeQuerySql: parsedQueryFailure.sql
            };
        });
    }

    // PanelQueryFailed detail payload shape: mode:<m>--panel:<id>--panel_name:<n>--error:<e>--sql_b64:<b64>--sql:<raw>
    private parsePanelQueryFailureDetail(detail: string): any {
        const raw = (detail || '').toString();
        const mode = this.extractDetailSegment(raw, 'mode:', '--panel:');
        let panel = this.extractDetailSegment(raw, '--panel:', '--panel_name:');
        let panelName = this.extractDetailSegment(raw, '--panel_name:', '--error:');
        if (!panel) panel = this.extractDetailSegment(raw, '--panel:', '--error:');
        if (!panelName) panelName = '-';
        const sqlB64 = this.extractDetailSegment(raw, '--sql_b64:', '--sql:');
        const error = this.extractDetailSegment(raw, '--error:', '--sql:');
        const sql = this.extractDetailSegment(raw, '--sql:', '');
        return { mode, panel, panelName, error, sqlB64, sql };
    }

    private extractDetailSegment(value: string, startToken: string, endToken: string): string {
        const startIndex = value.indexOf(startToken);
        if (startIndex < 0) return '';
        const from = startIndex + startToken.length;
        if (!endToken) return value.substring(from).trim();
        const endIndex = value.indexOf(endToken, from);
        if (endIndex < 0) return value.substring(from).trim();
        return value.substring(from, endIndex).trim();
    }

    openQueryErrorDialog(rowData: any) {
        this.queryErrorCopyStatus = '';
        this.selectedQueryError = {
            reportName: rowData?.typeDashboardTitle || '-',
            reportId: rowData?.typeDashboardId || '-',
            panelName: rowData?.typePanelName || '-',
            panelId: rowData?.typePanelId || '-',
            mode: rowData?.typeQueryMode || '-',
            error: rowData?.typeQueryError || '-',
            sql: this.formatSqlForDisplay(this.getRawSqlFromLog(rowData))
        };
        this.queryErrorDialogVisible = true;
    }

    async copyQuerySqlToClipboard() {
        const sql = (this.selectedQueryError && this.selectedQueryError.sql) ? this.selectedQueryError.sql.toString() : '';
        if (!sql || sql === '-') {
            this.queryErrorCopyStatus = $localize`:@@LogsSqlNotAvailable:SQL no disponible`;
            return;
        }
        try {
            if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(sql);
                this.queryErrorCopyStatus = $localize`:@@LogsSqlCopied:SQL copiado`;
                return;
            }
        } catch (e) {
            // fall through to the legacy textarea fallback below
        }
        const textArea = document.createElement('textarea');
        textArea.value = sql;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            this.queryErrorCopyStatus = $localize`:@@LogsSqlCopied:SQL copiado`;
        } catch (e) {
            this.queryErrorCopyStatus = $localize`:@@LogsCopyFailed:Error al copiar`;
        }
        document.body.removeChild(textArea);
    }

    private getRawSqlFromLog(rowData: any): string {
        const encoded = rowData?.typeQuerySqlB64 || '';
        if (encoded) {
            const decoded = this.decodeBase64Utf8(encoded);
            if (decoded) return decoded;
        }
        return rowData?.typeQuerySql || '';
    }

    private decodeBase64Utf8(encoded: string): string {
        try {
            const binary = atob(encoded);
            const escaped = Array.prototype.map.call(binary, (char: string) => {
                return '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2);
            }).join('');
            return decodeURIComponent(escaped);
        } catch (e) {
            return '';
        }
    }

    private formatSqlForDisplay(sql: string): string {
        if (!sql) return '-';
        try {
            return formatSqlStatement(sql, { language: 'sql' });
        } catch (e) {
            return sql;
        }
    }

    // type field format: id--title--detail
    private parseDashboardType(typeValue: string): any {
        const typeText = (typeValue || '').toString();
        const parts = typeText.split('--');
        return {
            dashboardId: parts[0] || '',
            dashboardTitle: parts[1] || '',
            detail: parts.slice(2).join('--') || ''
        };
    }

    private isDashboardAction(action: string): boolean {
        return ['DashboardAccessed', 'DashboardCreated', 'DashboardUpdated', 'DashboardRenamed', 'DashboardVisibilityChanged', 'DashboardDeleted', 'PanelQueryFailed'].includes(action);
    }

    private getActionLabel(action: string): string {
        const labels = {
            newLogin: $localize`:@@LogsActionNewLogin:Login`,
            DashboardAccessed: $localize`:@@LogsActionDashboardAccessed:Acceso a informe`,
            DashboardCreated: $localize`:@@LogsActionDashboardCreated:Informe creado`,
            DashboardUpdated: $localize`:@@LogsActionDashboardUpdated:Informe actualizado`,
            DashboardRenamed: $localize`:@@LogsActionDashboardRenamed:Informe renombrado`,
            DashboardVisibilityChanged: $localize`:@@LogsActionDashboardVisibilityChanged:Visibilidad del informe cambiada`,
            DashboardDeleted: $localize`:@@LogsActionDashboardDeleted:Informe eliminado`,
            PanelQueryFailed: $localize`:@@LogsActionPanelQueryFailed:Consulta del panel fallida`,
            UserCreated: $localize`:@@LogsActionUserCreated:Usuario creado`,
            UserUpdated: $localize`:@@LogsActionUserUpdated:Usuario actualizado`,
            UserDeleted: $localize`:@@LogsActionUserDeleted:Usuario eliminado`,
            UserRolesChanged: $localize`:@@LogsActionUserRolesChanged:Roles de usuario cambiados`,
            UserPasswordChanged: $localize`:@@LogsActionUserPasswordChanged:Contraseña de usuario cambiada`,
            GroupCreated: $localize`:@@LogsActionGroupCreated:Grupo creado`,
            GroupUpdated: $localize`:@@LogsActionGroupUpdated:Grupo actualizado`,
            GroupDeleted: $localize`:@@LogsActionGroupDeleted:Grupo eliminado`,
            GroupMembershipChanged: $localize`:@@LogsActionGroupMembershipChanged:Membresía de grupo cambiada`,
            UpdateModelStarted: $localize`:@@LogsActionUpdateModelStarted:Actualización del modelo iniciada`,
            UpdateModelUsersAndGroupsSynced: $localize`:@@LogsActionUpdateModelUsersAndGroupsSynced:Usuarios/Grupos sincronizados`,
            UpdateModelUsersAndGroupsSyncFailed: $localize`:@@LogsActionUpdateModelUsersAndGroupsSyncFailed:Fallo en sincronización de Usuarios/Grupos`,
            UpdateModelRolesMapped: $localize`:@@LogsActionUpdateModelRolesMapped:Roles mapeados`,
            UpdateModelRolesMappingFailed: $localize`:@@LogsActionUpdateModelRolesMappingFailed:Fallo en mapeo de roles`,
            UpdateModelDataModelBuilt: $localize`:@@LogsActionUpdateModelDataModelBuilt:Modelo de datos construido`,
            UpdateModelDataModelBuildFailed: $localize`:@@LogsActionUpdateModelDataModelBuildFailed:Fallo en construcción del modelo de datos`,
            UpdateModelCompleted: $localize`:@@LogsActionUpdateModelCompleted:Actualización del modelo completada`,
            UpdateModelPushFailed: $localize`:@@LogsActionUpdateModelPushFailed:Fallo en push del modelo`,
            UpdateModelFailed: $localize`:@@LogsActionUpdateModelFailed:Fallo en actualización del modelo`
        };
        return labels[action] || action || '-';
    }

    private getOperationLabel(action: string, detail: string): string {
        const actionLabels = {
            DashboardAccessed: $localize`:@@LogsActionAccess:Acceso`,
            DashboardCreated: $localize`:@@LogsActionCreation:Creación`,
            DashboardUpdated: $localize`:@@LogsActionUpdate:Actualización`,
            DashboardRenamed: $localize`:@@LogsActionRename:Renombrado`,
            DashboardVisibilityChanged: $localize`:@@LogsActionVisibilityChange:Cambio de visibilidad`,
            DashboardDeleted: $localize`:@@LogsActionDeletion:Eliminación`,
            PanelQueryFailed: $localize`:@@LogsActionQueryFailure:Fallo de consulta`,
            UserCreated: $localize`:@@LogsActionUserCreation:Creación de usuario`,
            UserUpdated: $localize`:@@LogsActionUserUpdate:Actualización de usuario`,
            UserDeleted: $localize`:@@LogsActionUserDeletion:Eliminación de usuario`,
            UserRolesChanged: $localize`:@@LogsActionUserRolesChange:Cambio de roles de usuario`,
            UserPasswordChanged: $localize`:@@LogsActionUserPasswordChange:Cambio de contraseña de usuario`,
            GroupCreated: $localize`:@@LogsActionGroupCreation:Creación de grupo`,
            GroupUpdated: $localize`:@@LogsActionGroupUpdate:Actualización de grupo`,
            GroupDeleted: $localize`:@@LogsActionGroupDeletion:Eliminación de grupo`,
            GroupMembershipChanged: $localize`:@@LogsActionGroupMembershipChange:Cambio de membresía de grupo`,
            UpdateModelStarted: $localize`:@@LogsActionModelUpdateStart:Inicio de actualización del modelo`,
            UpdateModelUsersAndGroupsSynced: $localize`:@@LogsActionUsersGroupsSync:Sincronización de usuarios/grupos`,
            UpdateModelUsersAndGroupsSyncFailed: $localize`:@@LogsActionUsersGroupsSyncFailure:Fallo en sincronización de usuarios/grupos`,
            UpdateModelRolesMapped: $localize`:@@LogsActionRoleMapping:Mapeo de roles`,
            UpdateModelRolesMappingFailed: $localize`:@@LogsActionRoleMappingFailure:Fallo en mapeo de roles`,
            UpdateModelDataModelBuilt: $localize`:@@LogsActionDataModelBuild:Construcción del modelo de datos`,
            UpdateModelDataModelBuildFailed: $localize`:@@LogsActionDataModelBuildFailure:Fallo en construcción del modelo de datos`,
            UpdateModelCompleted: $localize`:@@LogsActionModelUpdateCompleted:Actualización del modelo completada`,
            UpdateModelPushFailed: $localize`:@@LogsActionModelPushFailure:Fallo en push del modelo`,
            UpdateModelFailed: $localize`:@@LogsActionModelUpdateFailure:Fallo en actualización del modelo`
        };
        if (actionLabels[action]) return actionLabels[action];
        if (detail === 'attempt') return $localize`:@@LogsActionAttempt:Intento`;
        if (detail === 'login') return $localize`:@@LogsActionLogin:Inicio de sesión`;
        return detail || '-';
    }

}
