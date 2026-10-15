// Single catalog of the dashboard actions shared by the ⋮ menu and the quick actions bar.
// Commands live in DashboardSidebarComponent.runAction(); this file only holds metadata and permissions.

export type DashboardMenuSection = 'create' | 'filters' | 'report' | 'share' | 'settings' | 'danger';

export interface DashboardAction {
  id: string;
  section: DashboardMenuSection;
  label: string;
  icon: string;
  /** Can be pinned to the quick actions bar */
  pinnable: boolean;
}

export interface DashboardDownloadFormat {
  id: string;
  label: string;
  icon: string;
  color: string;
}

/** Display order of the menu */
export const DASHBOARD_ACTIONS: DashboardAction[] = [
  { id: 'newPanel', section: 'create', label: $localize`:@@newPanelTitle:Nuevo panel`, icon: 'pi pi-plus-circle', pinnable: true },
  { id: 'newFilter', section: 'create', label: $localize`:@@dashboardSidebarNewFilter:Nuevo filtro`, icon: 'pi pi-filter', pinnable: true },
  { id: 'newText', section: 'create', label: $localize`:@@dashboardSidebarNewText:Nuevo texto`, icon: 'pi pi-file-edit', pinnable: true },
  { id: 'newTabs', section: 'create', label: $localize`:@@dashboardSidebarNewTabs:Nuevo navegador`, icon: 'pi pi-folder', pinnable: true },
  { id: 'importPanel', section: 'create', label: $localize`:@@dashboardSidebarImportPanel:Importar panel`, icon: 'pi pi-file-import', pinnable: true },
  { id: 'editFilters', section: 'filters', label: $localize`:@@dashboardSidebarEditFilter:Editar filtros`, icon: 'pi pi-list', pinnable: true },
  { id: 'dependentFilters', section: 'filters', label: $localize`:@@dashboardSidebarDependentFilters:Filtros dependientes`, icon: 'pi pi-sitemap', pinnable: true },
  { id: 'save', section: 'report', label: $localize`:@@dashboardSidebarSave: Guardar`, icon: 'pi pi-save', pinnable: true },
  { id: 'saveAs', section: 'report', label: $localize`:@@dashboardSidebarSaveAs: Guardar como`, icon: 'pi pi-copy', pinnable: true },
  { id: 'refreshDashboard', section: 'report', label: $localize`:@@dashboardSidebarRefreshDashboard: Recargar informe`, icon: 'pi pi-refresh', pinnable: true },
  { id: 'download', section: 'share', label: $localize`:@@dashboardSidebarDownload:Descargar...`, icon: 'pi pi-download', pinnable: true },
  { id: 'sendEmail', section: 'share', label: $localize`:@@opcionMail: Enviar por email`, icon: 'pi pi-envelope', pinnable: true },
  { id: 'dashboardPrivacity', section: 'share', label: $localize`:@@dashboardSidebarDashboardPrivacity: Privacidad informe`, icon: 'pi pi-lock', pinnable: true },
  { id: 'editStyles', section: 'settings', label: $localize`:@@dashboardSidebarEditStyles: Editar estilos`, icon: 'pi pi-palette', pinnable: true },
  { id: 'addTag', section: 'settings', label: $localize`:@@addTag: Añadir etiqueta`, icon: 'pi pi-tag', pinnable: true },
  { id: 'reportOptions', section: 'settings', label: $localize`:@@dashboardSidebarReportOptions:Opciones del informe...`, icon: 'pi pi-sliders-v', pinnable: true },
  { id: 'customAction', section: 'settings', label: $localize`:@@dashboardSidebarCustomAction: Acción personalizada`, icon: 'pi pi-bolt', pinnable: true },
  // Never pinnable: a destructive action must stay one deliberate step away
  { id: 'deleteDashboard', section: 'danger', label: $localize`:@@dashboardSidebarDeleteDashboard: Eliminar informe`, icon: 'pi pi-trash', pinnable: false },
].map(action => ({ ...action, label: action.label.trim() })) as DashboardAction[];

export const DASHBOARD_DOWNLOAD_FORMATS: DashboardDownloadFormat[] = [
  { id: 'downloadPDF', label: $localize`:@@dashboardSidebarDownloadPDF: Descargar PDF`, icon: 'pi pi-file-pdf', color: 'text-red-600' },
  { id: 'downloadImage', label: $localize`:@@dashboardSidebarDownloadImage:Descargar Imagen`, icon: 'pi pi-image', color: 'text-sky-600' },
  { id: 'downloadExcel', label: $localize`:@@dashboardSidebarDownloadExcel:Descargar Excel`, icon: 'pi pi-file-excel', color: 'text-green-600' },
  { id: 'downloadWord', label: $localize`:@@dashboardSidebarDownloadWord:Descargar Word`, icon: 'pi pi-file-word', color: 'text-blue-700' },
].map(format => ({ ...format, label: format.label.trim() }));

export function getDashboardAction(id: string): DashboardAction | undefined {
  return DASHBOARD_ACTIONS.find(action => action.id === id);
}

/**
 * Same permissions the menu always had: everyone can download, refresh needs a non read-only
 * user, every other action needs a user who can edit the dashboard.
 */
export function canUseDashboardAction(id: string, perms: { readOnly: boolean; editable: boolean }): boolean {
  if (id === 'download') return true;
  if (id === 'refreshDashboard') return !perms.readOnly;
  return !perms.readOnly && perms.editable;
}
