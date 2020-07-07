import { SpinnerService } from '../../../../services/shared/spinner.service';
import { TreeNode } from 'primeng/api';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { AlertService, DataSourceService } from '@eda/services/service.index';
import Swal from 'sweetalert2';


@Component({
    selector: 'app-data-source-list',
    templateUrl: './data-source-list.component.html',
    styleUrls: ['./data-source-list.component.css']
})
export class DataSourceListComponent implements OnInit, OnDestroy {
    public treeData: any[] = [];
    public selectedFile: TreeNode;
    public id: string;
    navigationSubscription: any;

    constructor(public DataModelService: DataSourceService,
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
        this.DataModelService.currentTreeData.subscribe(
            (data) => this.treeData = data,
            (err) => this.alertService.addError(err)
        );

        this.DataModelService.getModelById(this.id);
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
        Swal.fire({
            title: '¿Estas seguro?',
            text: `Estas a punto de borrar el modelo de datos y todos los dashboards asociados, el cambio es irreversible`,
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Si, Eliminalo!'
        }).then(borrado => {
            if (borrado.value) {
                this.spinnerService.on();
                this.DataModelService.deleteModel(this.id).subscribe(
                    () => {
                        Swal.fire('Eliminado!', 'Modelo eliminado correctamente.', 'success');
                        this.DataModelService.cleanAll();
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
        event.node.data === 'tabla' ? this.DataModelService.editTable(event.node) :
            event.node.data === 'columna' ? this.DataModelService.editColumn(event.node) : this.DataModelService.editModel(event.node);
    }

    nodeUnselect(event: any) {
        // De moment res
    }

    refreshModel() {
        this.DataModelService.cleanAll();
        this.ngOnInit();
    }

    reLoadModelFromDb(){
        this.spinnerService.on();
        this.DataModelService.realoadModelFromDb(this.id).subscribe(
            () => {
                this.refreshModel(); 
                this.alertService.addSuccess('Modelo actualizado correctamente');
                this.spinnerService.off()},
            err => {
                this.alertService.addError(err);
                this.spinnerService.off()},
        );
    }

}
