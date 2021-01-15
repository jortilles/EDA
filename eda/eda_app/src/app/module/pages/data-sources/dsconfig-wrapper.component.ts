import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SidebarService, DataSourceService, SpinnerService, AlertService } from '@eda/services/service.index';
import Swal from 'sweetalert2';
import { UploadFileComponent } from './data-source-detail/upload-file/upload-file.component';

@Component({
  selector: 'dsconfig-wrapper',
  templateUrl: './dsconfig-wrapper.component.html',

})
export class DsConfigWrapperComponent implements OnInit {

  @ViewChild('fileUploader', { static: false }) fileUploader: UploadFileComponent;

  public dbTypes: any[] = [
    { name: 'Postgres', value: 'postgres' },
    { name: 'Sql Server', value: 'sqlserver' },
    { name: 'MySQL', value: 'mysql' },
    { name: 'Vertica', value: 'vertica' },
    { name: 'Oracle', value: 'oracle' },
    { name: 'BigQuery', value: 'bigquery' }
  ];

  public sidOpts: any[] = [
    { name: 'SID', value: 1 },
    { name: 'SERVICE_NAME', value: 0 }];

  public form: FormGroup;
  public type: any;
  public name: string;
  public header: string = $localize`:@@DataModelHeader:Configurar nuevo orígen de datos`;
  public optimizeString : string = $localize`:@@OptimizeQuery:Optimizar consultas`;
  public optimize: boolean = true;
  private project_id: string;



  constructor(
    private formBuilder: FormBuilder,
    private sidebarService: SidebarService,
    private dataSourceService: DataSourceService,
    private spinnerService: SpinnerService,
    private alertService: AlertService,
    private router: Router) {

    this.form = this.formBuilder.group({
      name: [null, Validators.required],
      type: [null, Validators.required],
      host: [null],
      db: [null],
      port: [null],
      user: [null],
      password: [null],
      schema: [null],
      sid: [{ name: 'SID', value: 1 }],
      optimize: [true]
    });

  }

  ngOnInit(): void {

  }

  switchTypes() {

    if (this.form.invalid) {
      this.alertService.addError('Formulario incorrecto, revise los campos');
    }
    else if (this.form.value.type.value !== 'bigquery') {

      this.addDataSource();

    }
    else {
      this.addBigQueryDataSource();
    }
  }

  addBigQueryDataSource() {
    this.spinnerService.on();
    let connection = {
      name: this.form.value.name,
      type: this.form.value.type.value,
      database: this.form.value.db,
      project_id: this.project_id
    }

    this.dataSourceService.testConnection(connection).subscribe(

      () => {
        const optimize = this.form.value.optimize ? 1 : 0;
        this.dataSourceService.addDataSource(connection, optimize).subscribe(
          res => {
            let title = $localize`:@@DatadourceTitle:Fuente de datos: `
            Swal.fire({
              title: `${title} ${this.form.value.name}`,
              text: $localize`:@@DatasourceText:Creada correctamente`,
              type: 'success'
            });
            this.reloadDataSources();
            this.spinnerService.off();
            this.router.navigate(['/data-source/', res.data_source_id]);
          },
          err => {
            this.spinnerService.off();
            this.alertService.addError(err);
          }
        );
      },
      err => {
        this.spinnerService.off();
        this.alertService.addError(err);
      }

    )
  }

  addDataSource() {

    this.spinnerService.on();
    let connection = {
      name: this.form.value.name,
      type: this.form.value.type.value,
      host: this.form.value.host,
      database: this.form.value.db,
      port: this.form.value.port,
      user: this.form.value.user,
      password: this.form.value.password,
      schema: this.form.value.schema,
      sid: this.form.value.sid.value,
    };

    this.dataSourceService.testConnection(connection).subscribe(
      () => {
        const optimize = this.optimize ? 1 : 0; // count rows in every table
        this.dataSourceService.addDataSource(connection, optimize).subscribe(
          res => {
            let title = $localize`:@@DatadourceTitle:Fuente de datos: `
            Swal.fire({
              title: `${title} ${this.form.value.name}`,
              text: $localize`:@@DatasourceText:Creada correctamente`,
              type: 'success'
            });
            this.reloadDataSources();
            this.spinnerService.off();
            this.router.navigate(['/data-source/', res.data_source_id]);
          },
          err => {
            this.spinnerService.off();
            this.alertService.addError(err);
          }
        );
      },
      err => {
        this.spinnerService.off();
        this.alertService.addError(err);
      }
    );
  }

  selectDefaultPort() {
    const type = this.form.value.type.value;
    switch (type) {
      case 'postgres':
        this.form.patchValue({ port: 5432 });
        break;
      case 'sqlserver':
        this.form.patchValue({ port: 1433 });
        break;
      case 'mongo':
        this.form.patchValue({ port: 27017 });
        break;
      case 'mysql':
        this.form.patchValue({ port: 3306 });
        break;
      case 'oracle':
        this.form.patchValue({ port: 1521 });
        break;
      default:
        this.form.patchValue({ port: null });
        break;
    }
  }

  reloadDataSources() {
    this.sidebarService.getDataSourceNames();
  }

  goToDataSource(datasource) {
    if (datasource) {
      this.router.navigate(['/data-source/', datasource._id]);
    } else {
      this.alertService.addError($localize`:@@ErrorMessage:Ha ocurrido un error`);
    }
  }

  fileLoaded() {

    this.project_id = this.fileUploader.currentFile.file.project_id;
    console.log(this.project_id);

  }


}