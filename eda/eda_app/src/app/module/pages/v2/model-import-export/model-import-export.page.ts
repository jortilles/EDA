
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService, DataSourceService } from '@eda/services/service.index';
import { DataSourceNamesService } from '@eda/services/shared/datasource-names.service';
import { DropdownModule } from 'primeng/dropdown';
import { lastValueFrom } from 'rxjs/internal/lastValueFrom';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { DomSanitizer } from '@angular/platform-browser';
import { AlertService } from '@eda/services/service.index';


@Component({
  selector: 'app-model-import-export',
  templateUrl: './model-import-export.page.html',
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownModule, IconComponent],
  styles: []
})
export class ModelImportExportPage implements OnInit {
  private dataSourceNamesService = inject(DataSourceNamesService);
  private dashboardService = inject(DashboardService);
  private dataSourceService = inject(DataSourceService);
  private alertService = inject(AlertService);

  // Signals para el estado
  modelTab = signal<'export' | 'import'>('export');
  dashboardTab = signal<'export' | 'import'>('export');
  selectedModel = signal<string>('');
  selectedDashboard = signal<string>('');
  modelFile = signal<File | null>(null);
  modelFileName = signal<string>('');
  dashboardFile = signal<File | null>(null);
  dashboardFileName = signal<string>('');
  dashboardData = signal<any>(null);
  isDraggingDashboard = signal<boolean>(false);
  isDraggingModel = signal<boolean>(false);

  private globalDSRoute = '/datasource';
  public downloadJsonDashboardHref: any;
  public dataSources: any[] = [];
  public dashboards: any[] = [];

  ngOnInit(): void {
    this.loadData();
  }

  private async loadData() {
    const data = await lastValueFrom(this.dataSourceNamesService.getModelsNames());
    this.dataSources = data.ds
      .map(elem => ({ label: elem.model_name, value: elem._id }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));

    const data2 = await lastValueFrom(this.dashboardService.getDashboards());
    const dashboards = [].concat.apply([], [data2.dashboards, data2.group, data2.publics, data2.shared]);

    this.dashboards = dashboards
      .map(elem => ({ label: elem.config.title, value: elem }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
  }

  // Métodos para cambiar tabs
  setModelTab(tab: 'export' | 'import') {
    this.modelTab.set(tab);
  }

  setDashboardTab(tab: 'export' | 'import') {
    this.dashboardTab.set(tab);
  }

  // Métodos para seleccionar modelos/dashboards
  setSelectedModel(value: string) {
    this.selectedModel.set(value);
  }

  setSelectedDashboard(value: string) {
    this.selectedDashboard.set(value);
  }

  // Métodos para manejar eventos de drag & drop
  handleDrag(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  handleDragIn(e: DragEvent, type: 'model' | 'dashboard') {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'model') {
      this.isDraggingModel.set(true);
    } else {
      this.isDraggingDashboard.set(true);
    }
  }

  handleDragOut(e: DragEvent, type: 'model' | 'dashboard') {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'model') {
      this.isDraggingModel.set(false);
    } else {
      this.isDraggingDashboard.set(false);
    }
  }

  handleDrop(e: DragEvent, type: 'model' | 'dashboard') {
    e.preventDefault();
    e.stopPropagation();

    if (type === 'model') {
      this.isDraggingModel.set(false);
    } else {
      this.isDraggingDashboard.set(false);
    }

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(files[0], type);
    }
  }

  handleFileSelect(e: Event, type: 'model' | 'dashboard') {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.handleFiles(files[0], type);
      input.value = '';
    }
  }

  handleFiles(file: File, type: 'model' | 'dashboard') {
    if (type === 'model') {
      this.modelFileName.set(file.name);
      this.modelFile.set(file);
    } else {
      this.dashboardFileName.set(file.name);
      this.dashboardFile.set(file);
    }
  }

  // Métodos para manejar exportación/importación
handleModelExport() {
  const selected = this.selectedModel();
  if (!selected) {
    this.alertService.addError($localize`:@@selectModelToExport:Por favor selecciona un modelo para exportar`)
    return;
  }

  const id = selected; 
  this.dataSourceService.get(`${this.globalDSRoute}/${id}`).subscribe(
    (data: any) => {
      const theJSON = JSON.stringify(data.dataSource);
      const blob = new Blob([theJSON], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'modelo.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      this.alertService.addSuccess($localize`:@@modelExportedSucessfully:Modelo exportado correctamente`)
    },
    err => {
      this.alertService.addError($localize`:@@problemExportingModel:Ocurrió un problema al exportar el modelo`)
    }
  );
}


handleDashboardExport() {
  const dashboardId = this.selectedDashboard()['_id'];
  if (!dashboardId) {
    this.alertService.addError($localize`:@@selectDashboardToExport:Por favor selecciona un dashboard para exportar`)
    return;
  }

  this.dashboardService.getDashboard(dashboardId).subscribe(
    data => {
      const theJSON = JSON.stringify(data.dashboard);
      const blob = new Blob([theJSON], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = this.selectedDashboard()['config'].title + '.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      this.alertService.addSuccess($localize`:@@dashboardExportedSuccessfully:Dashboard exportado correctamente`)
    },
    err => {
      this.alertService.addError($localize`:@@selectDashboardToExport:Por favor selecciona un dashboard para exportar`)
    }
  );
}




handleModelImport() {
  if (!this.modelFile()) {
      this.alertService.addError($localize`:@@selectFileImport:Por favor selecciona un archivo para importar`)
    return;
  }

  // Antiguo onModelFilesAdded() modificado, separar logica?
  const fileReader = new FileReader();
  fileReader.onload = () => {
    try {
      const json = JSON.parse(fileReader.result as string);
      const modelId = json._id;
      const tables = json.ds.model.tables;
      const modelInconsistencies: string[] = [];
      let isInconsistentDM = true;
      

      // Recorremos dashboards para comprobar integridad
      this.dashboards.forEach(({ value }) => {
        this.dashboardService.getDashboard(value._id).subscribe({
          next: ({ dashboard }) => {
            if (modelId === dashboard.config.ds._id) {
              dashboard.config.panel.forEach(panel => {
                panel.content.query.query.fields.forEach(field => {
                  const table = tables.find(t => t.table_name === field.table_id);
                  if (!table) {
                    isInconsistentDM = false;
                    if (!modelInconsistencies.includes(dashboard.config.title)) {
                      modelInconsistencies.push(dashboard.config.title);
                    }
                  } else {
                    const column = table.columns.find(c => c.column_name === field.column_name);
                    if (!column) {
                      isInconsistentDM = false;
                      if (!modelInconsistencies.includes(dashboard.config.title)) {
                        modelInconsistencies.push(dashboard.config.title);
                      }
                    }
                  }
                });
              });
            }
          },
          error: () => this.alertService.addError($localize`:@@errorVerifyingModelIntegrity:Error al verificar integridad del modelo`)
        });
      });

      // Actualizamos el modelo en el servidor --> Antiguo importModel()
      this.dataSourceService.updateModelInServer(modelId, json).subscribe({
        next: () => this.alertService.addSuccess($localize`:@@modelImportedSuccessfully:Modelo importado correctamente`),
        error: () => this.alertService.addError($localize`:@@errorImportModel:Ha ocurrido un error al importar el modelo`)

      });
    } catch {
      this.alertService.addError($localize`:@@noCorrectJsonFormat:El archivo no tiene un formato JSON válido`);
    }
  };
  fileReader.readAsText(this.modelFile());

  // Clean fields
  this.modelFileName.set('');
  this.modelFile.set(null);
}



handleDashboardImport() {
  if (!this.dashboardFile()) {
    this.alertService.addError($localize`:@@selectFileImport:Por favor selecciona un archivo para importar`);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const importedDashboard = JSON.parse(reader.result as string);

      // Guardamos el dashboard importado en memoria
      this.dashboardFile.set(importedDashboard);

      // Intentar actualizar
      this.dashboardService.updateDashboard(importedDashboard._id, importedDashboard).subscribe(
        () => {
          this.alertService.addSuccess($localize`:@@dashboardUpdatedSuccessfully:Dashboard actualizado correctamente`)
        },
        () => {
          // Si falla, intentar crear
          this.dashboardService.addNewDashboard(importedDashboard).subscribe(
            () => {
              this.alertService.addSuccess($localize`:@@dashboardCreatedSuccessfully:Dashboard creado correctamente`)
            },
            err => {
              this.alertService.addError($localize`:@@notPossibleImportDashboard:No se pudo importar el dashboard:` + err.message + 'error')
            }
          );
        }
      );
    } catch (e) {
      this.alertService.addError($localize`:@@noValidJsonFormat:El archivo no tiene un formato JSON válido:` + e.message + 'error')
    }
  };

  reader.onerror = () => {
    this.alertService.addError($localize`:@@notPossibleReadFile:No se pudo leer el archivo seleccionado`)
  };

  reader.readAsText(this.dashboardFile());

  // Clean fields
  this.dashboardFile.set(null);
  this.dashboardFileName.set('');
}

  // Método para mostrar notificaciones
  showToast(title: string, message: string, type: 'success' | 'error') {
    // Implementación simple de toast
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-[#00BFB3]' : 'bg-red-500';
    toast.className = `fixed bottom-4 right-4 ${bgColor} text-white p-4 rounded-md shadow-lg z-50 flex flex-col`;
    toast.innerHTML = `
      <h4 class="font-semibold">${title}</h4>
      <p>${message}</p>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }
}