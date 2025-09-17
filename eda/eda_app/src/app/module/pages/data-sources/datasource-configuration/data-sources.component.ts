import { Router } from '@angular/router';
import { Component } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { AlertService, SidebarService, SpinnerService, DataSourceService } from '@eda/services/service.index';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-data-sources',
    templateUrl: './data-sources.component.html'
})
export class DataSourcesComponent {
    // Page Variables
    public form: UntypedFormGroup;
    public optimize : boolean= true;
    public sidOpts : any[] = [
        { name: 'SID', value: 1 },
        { name: 'SERVICE_NAME', value: 0 }];

    public dbTypes: any[] = [
        { name: 'Postgres', value: 'postgres' },
        { name: 'Sql Server', value: 'sqlserver' },
        { name: 'MySQL', value: 'mysql' },
        { name: 'Vertica', value: 'vertica' },
        { name: 'Oracle', value: 'oracle' }
    ];

    constructor(private formBuilder: UntypedFormBuilder,
        private sidebarService: SidebarService,
        private dataSourceService: DataSourceService,
        private spinnerService: SpinnerService,
        private alertService: AlertService,
        private router: Router) {

        this.form = this.formBuilder.group({
            name: [null, Validators.required],
            type: [null, Validators.required],
            host: [null, Validators.required],
            db: [null, Validators.required],
            port: [null, Validators.required],
            user: [null, Validators.required],
            password: [null, Validators.required],
            schema: [ null],
            sid:[{ name: 'SID', value: 1 }],
            ssl:  [false],
            poolLimit: [null]
        });

    }

    addDataSource() {
        if (this.form.invalid) {
            this.alertService.addError('Formulario incorrecto, revise los campos');
        } else {
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
                optimize : this.optimize ? 1 : 0,
                ssl: this.form.value.ssl ? true : false,

            };

            this.dataSourceService.testConnection(connection).subscribe(
                () => {
        
                    this.dataSourceService.addDataSource(connection).subscribe(
                        res => {
                            let title = $localize`:@@DatadourceTitle:Fuente de datos: `
                            Swal.fire({
                                title: `${title} ${this.form.value.name}`,
                                text: $localize`:@@DatasourceText:Creada correctamente`,
                                icon: 'success'
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
    }

    selectDefaultPort() {
        const type = this.form.value.type.value;
        switch (type) {
            case 'postgres':
                this.form.patchValue({ port: 5432 });
                break;
            case 'vertica':
                this.form.patchValue({ port: 5433 });
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
                this.form.patchValue({ port:1521 });
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
}
