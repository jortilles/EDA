import { SpinnerService } from '../../../../services/shared/spinner.service';
import { TreeNode } from 'primeng/api';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { AlertService, DataSourceService } from '@eda/services/service.index';
import Swal, { SweetAlertOptions } from 'sweetalert2';
import * as _ from 'lodash';


@Component({
    selector: 'app-data-source-list',
    templateUrl: './data-source-list.component.html',
    styleUrls: ['./data-source-list.component.css']
})
export class DataSourceListComponent implements OnInit, OnDestroy {
    public treeData: any[] = [];
    public selectedFile: TreeNode;
    public id: string;
    public navigationSubscription: any;

    constructor(public dataModelService: DataSourceService,
                private alertService: AlertService,
                private route: ActivatedRoute,
                private spinnerService: SpinnerService,
                private router: Router) {

        this.navigationSubscription = this.router.events.subscribe(
            (e: any) => {
                if (e instanceof NavigationEnd) {
                    this.ngOnInit();
                }
            }, (err) => this.alertService.addError(err)
        );

    }

    ngOnInit(): void {
        this.getDataSourceId();
        this.dataModelService.currentTreeData.subscribe(
            (data) => this.treeData = data,
            (err) => this.alertService.addError(err)
        );

        this.dataModelService.getModelById(this.id);        
    }

    ngOnDestroy(): void {
        if (this.navigationSubscription) {
            this.navigationSubscription.unsubscribe();
            this.navigationSubscription.complete();
        }
    }

    getDataSourceId() {
        this.route.paramMap.subscribe(
            (params) => this.id = params.get('id'),
            (err) => this.alertService.addError(err)
        );
    }

    deleteDatasource() {

        const options = 
        {
            title: $localize`:@@Sure:¿Estás seguro?`,
            text: $localize`:@@SureInfo:Estás a punto de borrar el modelo de datos y todos los dashboards asociados, el cambio es irreversible`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: $localize`:@@ConfirmDeleteModel:Si, ¡Eliminalo!`
        } as SweetAlertOptions
        Swal.fire(options).then(borrado => {
            if (borrado.value) {
                this.spinnerService.on();
                this.dataModelService.deleteModel(this.id).subscribe(
                    () => {
                        Swal.fire($localize`:@@Deleted:¡Eliminado!`, $localize`:@@DeleteSuccess:Modelo eliminado correctamente.`, 'success');
                        this.dataModelService.cleanAll();
                        this.router.navigate(['/home']);
                        this.spinnerService.off();
                    }, err => {
                        this.alertService.addError(err);
                        this.spinnerService.off();
                    }
                );
            }
        });
    }

    nodeSelect(event: { node: any; }) {
        event.node.data === 'tabla' ? this.dataModelService.editTable(event.node) :
            event.node.data === 'columna' ? this.dataModelService.editColumn(event.node) : this.dataModelService.editModel(event.node);
    }

    nodeUnselect(event: any) {
        // De moment res
    }

    refreshModel() {
        this.dataModelService.cleanAll();
        this.ngOnInit();
    }

    reLoadModelFromDb(){
        this.spinnerService.on();
        this.dataModelService.realoadModelFromDb(this.id).subscribe(
            () => {
                this.refreshModel(); 
                this.alertService.addSuccess($localize`:@@UpdateModelSucess:Modelo actualizado correctamente`);
                this.spinnerService.off()},
            err => {
                this.alertService.addError(err);
                this.spinnerService.off()},
        );
    }

}
