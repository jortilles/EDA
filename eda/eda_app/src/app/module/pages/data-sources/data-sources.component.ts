import { Router } from '@angular/router';
import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { AlertService, SidebarService, SpinnerService, DataSourceService } from '@eda/services/service.index';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-data-sources',
    templateUrl: './data-sources.component.html'
})
export class DataSourcesComponent {
    // Page Variables
    public form: FormGroup;
    public dbTypes: any[] = [
        { name: 'Postgres', value: 'postgres' },
        { name: 'Sql Server', value: 'sqlserver' },
        { name: 'MongoDB', value: 'mongo' },
        { name: 'MySQL', value: 'mysql' }
    ];

    constructor(private formBuilder: FormBuilder,
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
            password: [null, Validators.required]
        });
    }

    addDataSource() {
        if (this.form.invalid) {
            this.alertService.addError('Formulario incorrecto, revise los campos');
        } else {
            this.spinnerService.on();
            const connection = {
                name: this.form.value.name,
                type: this.form.value.type.value,
                host: this.form.value.host,
                database: this.form.value.db,
                port: this.form.value.port,
                user: this.form.value.user,
                password: this.form.value.password,
            };

            this.dataSourceService.testConnection(connection).subscribe(
                () => {
                    this.dataSourceService.addDataSource(connection).subscribe(
                        res => {
                            Swal.fire({
                                title: `Fuente de datos: ${this.form.value.name}`,
                                text: 'Creada correctamente',
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
    }

    selectDefaultPort() {
        const type = this.form.value.type.value;
        switch (type) {
            case 'postgres':
                this.form.patchValue({port: 5432});
                break;
            case 'sqlserver':
                this.form.patchValue({port: 1433});
                break;
            case 'mongo':
                this.form.patchValue({port: 27017});
                break;
            default:
                this.form.patchValue({port: null});
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
            this.alertService.addError('Ha ocurrido un error');
        }
    }
}
