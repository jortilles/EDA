import { Component, EventEmitter, inject, OnInit, Output } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, UntypedFormGroup, Validators } from "@angular/forms";
import { AlertService, DashboardService, GroupService, IGroup, SidebarService, StyleProviderService, TemplateService } from "@eda/services/service.index";
import { SelectItem } from "primeng/api";
import { CreateDashboardService } from "@eda/services/utils/create-dashboard.service";
import { SharedModule } from "@eda/shared/shared.module";
import { DropdownModule } from "primeng/dropdown";
import { ButtonModule } from "primeng/button";
import { MultiSelectModule } from "primeng/multiselect";
import { SelectButtonModule } from "primeng/selectbutton";
import { EdaDialog2Component } from "../shared-components.index";
import * as _ from 'lodash';
import { DataSourceNamesService } from "@eda/services/shared/datasource-names.service";
import { lastValueFrom } from "rxjs";

@Component({
    standalone: true,
    selector: 'app-create-dashboard',
    templateUrl: './create-dashboard.component.html',
    imports: [SharedModule, ReactiveFormsModule, FormsModule, DropdownModule, ButtonModule, SelectButtonModule, MultiSelectModule, EdaDialog2Component],
})
export class CreateDashboardComponent implements OnInit {
    private createDashboardService = inject(CreateDashboardService);
    private dataSourceNameService = inject(DataSourceNamesService);
    private templateService = inject(TemplateService);

    public display: boolean = false;
    public dataSources: any[] = [];
    public form: UntypedFormGroup;
    public dss: any[] = [];
    public grups: IGroup[] = [];
    public visibleTypes: SelectItem[] = [];
    public showGroups: boolean = false;

    public templates: any[] = [];
    public filteredTemplates: any[] = [];
    public selectedTemplate: any = null;
    public createMode: 'empty' | 'template' = 'empty';
    public showTemplateSelector: boolean = false;

    @Output() close: EventEmitter<any> = new EventEmitter();

    constructor(
        private formBuilder: FormBuilder,
        private alertService: AlertService,
        private groupService: GroupService,
        private dashboardService: DashboardService,
        private stylesProviderService: StyleProviderService
    ) {
        this.initializeForm();
    }

    public ngOnInit(): void {
        this.display = true;
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
            { label: $localize`:@@publicPanel:Publico`, value: 'open', icon: 'fa fa-fw fa-globe' },
            { label: $localize`:@@commonPanel:Común`, value: 'common', icon: 'fa fa-fw fa-globe' },
            { label: $localize`:@@group:Grupo`, value: 'group', icon: 'fa fa-fw fa-users' },
            { label: $localize`:@@privatePanel:Privado`, value: 'private', icon: 'fa fa-fw fa-lock' },
        ];

        this.form.controls['visible'].setValue(this.visibleTypes[3].value);

        this.dataSourceNameService.getDataSourceNamesForDashboard().subscribe((res) => {
            this.dataSources = res?.ds;
            this.dataSources = this.dataSources.sort((a, b) => {
                let va = a.model_name.toLowerCase();
                let vb = b.model_name.toLowerCase();
                return va < vb ?  -1 : va > vb ? 1 : 0
            });
        });
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

    public async onDataSourceChange(): Promise<void> {
        const selectedDs = this.form.value.ds;
        if (selectedDs && selectedDs._id) {
            try {
                const data = await lastValueFrom(this.templateService.getTemplates({ dataSourceId: selectedDs._id }));
                this.templates = data.templates || [];
                this.filteredTemplates = [...this.templates];
                this.showTemplateSelector = this.templates.length > 0;
            } catch (err) {
                this.templates = [];
                this.filteredTemplates = [];
                this.showTemplateSelector = false;
            }
        } else {
            this.templates = [];
            this.filteredTemplates = [];
            this.showTemplateSelector = false;
        }
        this.selectedTemplate = null;
        this.createMode = 'empty';
    }

    public selectTemplate(template: any): void {
        this.selectedTemplate = template;
        this.createMode = 'template';
        if (template.name && !this.form.value.name) {
            this.form.controls['name'].setValue(template.name + ' - ' + $localize`:@@newReport:Nuevo Informe`);
        }
    }

    public selectEmptyDashboard(): void {
        this.selectedTemplate = null;
        this.createMode = 'empty';
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
            return;
        }

        if (this.createMode === 'template' && this.selectedTemplate) {
            await this.createFromTemplate();
        } else {
            await this.createEmptyDashboard();
        }
    }

    private async createEmptyDashboard(): Promise<void> {
        const ds = { _id: this.form.value.ds._id };
        const body = {
            config: {
                ds,
                title: this.form.value.name,
                visible: this.form.value.visible,
                tag: null, 
                refreshTime:null, 
                clickFiltersEnabled:true, 
                styles: this.stylesProviderService.generateDefaultStyles(),
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

    private async createFromTemplate(): Promise<void> {
        try {
            const res = await lastValueFrom(
                this.templateService.createDashboardFromTemplate(
                    this.selectedTemplate._id,
                    {
                        name: this.form.value.name,
                        visible: this.form.value.visible,
                        group: this.form.value.group ? _.map(this.form.value.group, '_id') : undefined
                    }
                )
            );

            this.alertService.addSuccess($localize`:@@dashboardCreated:Informe creado correctamente`);
            this.onClose(res.dashboard);
        } catch (err) {
            this.alertService.addError(err);
            throw err;
        }
    }

    public onClose(res?: any): void {
        this.display = false;
        this.createDashboardService.close();
        this.templates = [];
        this.filteredTemplates = [];
        this.selectedTemplate = null;
        this.createMode = 'empty';
        this.showTemplateSelector = false;
        this.close.emit(res);
    }

    public disableApply(): boolean {
        return this.form.invalid;
    }
}
