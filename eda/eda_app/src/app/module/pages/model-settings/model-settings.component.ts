
import { DataSourceService } from './../../../services/api/datasource.service';
import { SelectItem } from 'primeng/api';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertService, DashboardService, SidebarService } from '@eda/services/service.index';
import { DomSanitizer } from '@angular/platform-browser';



@Component({
  selector: 'model-settings',
  templateUrl: './model-settings.component.html',
  styleUrls: ['./model-settings.component.css'],

})

export class ModelSettingsComponent implements OnInit {

  @ViewChild('file', { static: false }) file: { nativeElement: { files: { [key: string]: File; }; value: string; click: () => void; }; };
  @ViewChild('file2', { static: false }) file2: { nativeElement: { files: { [key: string]: File; }; value: string; click: () => void; }; };

  private globalDSRoute = '/datasource';
  public downloadJsonModelHref: any;
  public downloadJsonDashboardHref: any;
  public files: any;

  //STRINGS
  public header1: string = $localize`:@@Models_ms:Modelos`;;
  public header2: string = $localize`:@@Dashboards_ms:Informes`;
  public exportModelS: string = $localize`:@@ExportModel:Exportar Modelo`;
  public exportDBS: string = $localize`:@@ExportDashboard:Exportar Informe`;
  public importModelS: string = $localize`:@@importModel:Importar Modelo`;
  public importDBS: string = $localize`:@@importDashboard:Importar Informe`;
  public import: string = $localize`:@@import:Importar`;
  public DBInconsistenciesS: string = $localize`:@@DBInconsistencies:Se han encontrado inconsistencias en el informe, los siguientes elementos no existen en el modelo: `
  public modelInconsistenciesS: string = $localize`:@@modelInconsistenciesS:Se han encontrado inconsistencias en los siguientes informes: `;
  public modelSaved : string = $localize`:@@ModelSaved:Modelo guardado correctamente`;
  public downloadModel : string  = $localize`:@@downloadModel:Descargar modelo`;
  public downloadDashboard : string  = $localize`:@@downloadDashboard:Descargar informe`;

  //FORMS
  public exportModelForm: FormGroup;
  public dashBoardForm: FormGroup;

  //
  public dataSources: Array<SelectItem> = [];
  public dashboards: Array<SelectItem> = [];
  public loadedDashboard: any = null;
  public loadedDM: any = null;

  public DBInconsistencies: Array<string> = [];
  public isConsistentDB: boolean = true;

  public modelInconsistencies: Array<string> = [];
  public isInconsistentDM: boolean = true;


  constructor(
    private formBuilder: FormBuilder,
    private sidebarService: SidebarService,
    private dataSourceService: DataSourceService,
    private dashboardService: DashboardService,
    private sanitizer: DomSanitizer,
    private alertService: AlertService) {

    this.exportModelForm = this.formBuilder.group({
      model: [null, Validators.required]
    });

    this.dashBoardForm = this.formBuilder.group({
      dashboard: [null, Validators.required]
    });

  }

  ngOnInit(): void {
    this.initDatasources();
    this.initDashboards();
  }



  private initDatasources(): void {
    this.sidebarService.currentDatasources.subscribe(
      data => {
        this.dataSources = data.map(elem => {
          return { label: elem.model_name, value: elem._id }
        });
      },
      err => this.alertService.addError(err)
    );
  }

  private initDashboards(): void {
    this.dashboardService.getDashboards().subscribe(data => {
      let dashboards = [].concat.apply([], [data.dashboards, data.group, data.publics, data.shared]);
      //console.log(dashboards);
      this.dashboards = dashboards.map(d => {
        //console.log(d);
        return { label: d.config.title, value: d }
      })
    })
  }

  exportModel() {
    const id = this.exportModelForm.value.model;
    this.dataSourceService.get(`${this.globalDSRoute}/${id}`).subscribe((data: any) => {
      let theJSON = JSON.stringify(data.dataSource);
      let uri = this.sanitizer.bypassSecurityTrustUrl("data:text/json;charset=UTF-8," + encodeURIComponent(theJSON));
      this.downloadJsonModelHref = uri;
    });

  }

  exportDashboard() {
    const id = this.dashBoardForm.value.dashboard._id;

    this.dashboardService.getDashboard(id).subscribe(
      data => {
        let theJSON = JSON.stringify(data.dashboard);
        let uri = this.sanitizer.bypassSecurityTrustUrl("data:text/json;charset=UTF-8," + encodeURIComponent(theJSON));
        this.downloadJsonDashboardHref = uri;
      },
      err => {
        this.alertService.addError(err);
      });

  }

  async onDashboardFilesAdded() {
 
    const file = this.file2.nativeElement.files[0];
    try {
      let fileReader = new FileReader();
      fileReader.onload = (e) => {
        const loadedFile = fileReader.result as string;;
        const json = JSON.parse(loadedFile);
        this.loadedDashboard = json;

        /**Check dashboard integrity */
        const model_id = json.config.ds._id;
        const panels = json.config.panel;

        this.isConsistentDB = true;
        this.DBInconsistencies = []

        this.dataSourceService.get(`${this.globalDSRoute}/${model_id}`).subscribe((data: any) => {
          let tables = data.dataSource.ds.model.tables;

          panels.forEach(panel => {
            const fields = panel.content.query.query.fields;
            fields.forEach(field => {

              const table = tables.filter(t => t.table_name === field.table_id);
              if (table.length > 0) {
                const column = table[0].columns.filter(column => column.column_name === field.column_name)[0];
                if (!column) {
                  this.isConsistentDB = false;
                  this.DBInconsistencies.push(field.column_name);
                }
              } else {
                this.isConsistentDB = false;
                this.DBInconsistencies.push(field.table_id);
              }

            });
          });

        });
      }
      fileReader.readAsText(file);
    } catch (err) {
      console.log(err);
    }

  }

  async importDashboard() {

    this.dashboardService.updateDashboard(this.loadedDashboard._id, this.loadedDashboard).subscribe(
      () => {

        this.alertService.addSuccess($localize`:@@dahsboardSaved:Informe guardado correctamente`);
      },
      err => {
        this.dashboardService.addNewDashboard(this.loadedDashboard).subscribe(
          () => {

            this.alertService.addSuccess($localize`:@@dahsboardSaved:Informe guardado correctamente`);
          },
          err => {
            this.alertService.addError(err);
          }
        );
      }
    );
  }

  async onModelFilesAdded() {

    const file = this.file.nativeElement.files[0];
    try {
      let fileReader = new FileReader();
      fileReader.onload = (e) => {

        const loadedFile = fileReader.result as string;;
        const json = JSON.parse(loadedFile);
        this.loadedDM = json;

        /**Check dashboard integrity */
        const tables = json.ds.model.tables;

        this.isInconsistentDM = true;
        this.modelInconsistencies = [];

        this.dashboards.forEach(elem => {

          const id = elem.value._id;

          this.dashboardService.getDashboard(id).subscribe(
            data => {

              const dashboard = data.dashboard;
              const panels = dashboard.config.panel;

              let modelID = json._id;
              let dashboardModelID = dashboard.config.ds._id;

              if (modelID === dashboardModelID) {

                panels.forEach(panel => {

                  const fields = panel.content.query.query.fields;

                  fields.forEach(field => {

                    const table = tables.filter(t => t.table_name === field.table_id);

                    if (table.length > 0) {

                      const column = table[0].columns.filter(column => column.column_name === field.column_name)[0];

                      if (!column) {

                        this.isInconsistentDM = false;
                        if(!this.modelInconsistencies.includes(dashboard.config.title)){
                          this.modelInconsistencies.push(dashboard.config.title);
                        }

                      }
                    } else {

                      this.isInconsistentDM = false;
                      if(!this.modelInconsistencies.includes(dashboard.config.title)){
                        this.modelInconsistencies.push(dashboard.config.title);
                      }
                      
                    }

                  });
                });
              }
            },
            err => {
              this.alertService.addError(err);
            });


        });
      }

      fileReader.readAsText(file);

    } catch (err) {
      console.log(err);
    }

  }
  importModel(){

    this.dataSourceService.updateModelInServer(this.loadedDM._id, this.loadedDM).subscribe(
      (r) => this.alertService.addSuccess(this.modelSaved),
      (err) => this.alertService.addError($localize`:@@ErrorMessage:Ha ocurrido un error`)
  );

  }

  loadFile() {
    this.file.nativeElement.value = "";
    this.file.nativeElement.click();
  }

  loadDBFile(){
    this.file2.nativeElement.value = "";
    this.file2.nativeElement.click();
  }

}