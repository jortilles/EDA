import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { FormBuilder, UntypedFormGroup, Validators } from "@angular/forms";
import { AlertService, DashboardService, GroupService, IGroup, SidebarService, StyleProviderService } from "@eda/services/service.index";
import { SelectItem } from "primeng/api";
import * as _ from 'lodash';

@Component({
    selector: 'app-create-dashboard',
    templateUrl: './create-dashboard.component.html'
})
export class CreateDashboardComponent implements OnInit {
    public display: boolean = false;
    public dataSources: any[] = [];
    public form: UntypedFormGroup;
    public dss: any[] = [];
    public grups: IGroup[] = [];
    public visibleTypes: SelectItem[] = [];
    public showGroups: boolean = false;

    @Output() close: EventEmitter<any> = new EventEmitter();

    constructor(
        private formBuilder: FormBuilder,
        private alertService: AlertService,
        private groupService: GroupService,
        private dashboardService: DashboardService,
        private sidebarService: SidebarService,
        private stylesProviderService: StyleProviderService
    ) {
        this.initializeForm();
    }

    public ngOnInit(): void {
        this.display = true;
        this.sidebarService.getDataSourceNamesForDashboard();
        this.loadGroups();
    }

    private async initializeForm(): Promise <void> {
        this.form = this.formBuilder.group({
            name: [null, Validators.required],
            ds: [null, Validators.required],
            visible: [null, Validators.required],
            group: [null]
        });

        this.visibleTypes = [
            { label: $localize`:@@commonPanel:Común`, value: 'public', icon: 'fa fa-fw fa-globe' },
            { label: $localize`:@@groupPanel:Grupo`, value: 'group', icon: 'fa fa-fw fa-users' },
            { label: $localize`:@@privatePanel:Privado`, value: 'private', icon: 'fa fa-fw fa-lock' },
        ];

        this.form.controls['visible'].setValue(this.visibleTypes[2].value);

        this.sidebarService.currentDatasourcesDB.subscribe(
            (res) => {
                this.dataSources = res;
                this.dataSources = this.dataSources.sort((a, b) => {
                    let va = a.model_name.toLowerCase();
                    let vb = b.model_name.toLowerCase();
                    return va < vb ?  -1 : va > vb ? 1 : 0
                });
            }
        );
    }

    private async loadGroups(): Promise<void> {
        try {
            this.grups = await this.groupService.getGroupsByUser().toPromise();

            if (this.grups.length === 0) {
                this.visibleTypes.splice(1, 1);
            }
        } catch (err) {
            this.alertService.addError(err)
            throw err;
        }
    }

    public handleSelectedBtn(event): void {
        const groupControl = this.form.get('group');
        this.showGroups = event.value === 'group';

        if (this.showGroups) {
            groupControl.setValidators(Validators.required);
        }

        if (!this.showGroups) {
            groupControl.setValidators(null);
            groupControl.setValue(null);
        }

    }

    public async createNewDashboard(): Promise<void> {
        if (this.form.invalid) {
            this.alertService.addError('Recuerde rellenar los campos obligatorios');
        } else {
            const ds = { _id: this.form.value.ds._id };
            const body = {
                config: {
                    ds,
                    title: this.form.value.name,
                    visible: this.form.value.visible,
                    tag: null,
                    refreshTime:null,
                    styles:this.stylesProviderService.generateDefaultStyles(),
                    /*SDA CUSTOM*/ createdAt: new Date(),
                    /*SDA CUSTOM*/ modifiedAt: new Date(),
                    external: null
                },
                group: this.form.value.group
                    ? _.map(this.form.value.group, '_id')
                    : undefined
            };

            try {
                const res = await this.dashboardService.addNewDashboard(body).toPromise();
                this.onClose(res.dashboard);
            } catch (err) {
                this.alertService.addError(err);
                throw err;
            }
        }
    }

    private onClose(res?: any): void {
        this.close.emit(res);
    }
}
