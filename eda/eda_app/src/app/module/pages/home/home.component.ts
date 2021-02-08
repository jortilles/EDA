import { GroupService } from './../../../services/api/group.service';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService, DashboardService, SidebarService } from '@eda/services/service.index';
import { EdaDialogController, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { IGroup } from '@eda/services/api/group.service';
import Swal from 'sweetalert2';
import * as _ from 'lodash';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['../../../../assets/sass/eda-styles/components/home.component.css']
})
export class HomeComponent implements OnInit {
    public dashController: EdaDialogController;
    public dss: any[];
    public dashboards = {
        publics: [],
        privats: [],
        grups: [],
        shared: []
    };
    public visibleDashboards = {
        publics: [],
        privats: [],
        grups: [],
        shared: []
    }
    public selectedTag: any;

    public groups: IGroup[] = [];
    public isAdmin: boolean;
    public toLitle: boolean = false;
    public tags: Array<any> = [];
    public grups: Array<any> = [];
    public isObserver: boolean = false;

    public noTagLabel = $localize`:@@NoTag:Sin Etiqueta`;
    public AllTags = $localize`:@@AllTags:Todos`;

    constructor(
        private dashboardService: DashboardService,
        private sidebarService: SidebarService,
        private router: Router,
        private alertService: AlertService,
        private groupService: GroupService
    ) {
        this.sidebarService.getDataSourceNames();
        this.sidebarService.getDataSourceNamesForDashboard();

        if (window.innerWidth < 1000) {
            this.toLitle = true;
        }

    }

    public ngOnInit() {
        this.init();
        this.ifAnonymousGetOut();
    }

    private init() {
    
        this.initDatasources();
        this.initDashboards();
    }

    private setIsObserver = async () => {
        this.groupService.getGroupsByUser().subscribe(
            res => {
                const user = localStorage.getItem('user');
                const userID = JSON.parse(user)._id;
                this.grups = res;
                this.isObserver = this.grups.filter(group => group.name === 'RO' && group.users.includes(userID)).length !== 0
            },
            (err) => this.alertService.addError(err)
        );
    }

    private ifAnonymousGetOut(): void {
        const user = localStorage.getItem('user');
        const userName = JSON.parse(user).name;

        if (userName === 'edaanonim' || userName === 'RO') {
            this.router.navigate(['/login']);
        }
    }

    private initDatasources(): void {
        this.sidebarService.currentDatasourcesDB.subscribe(
            data => this.dss = data,
            err => this.alertService.addError(err)
        );
    }

    private initDashboards(): void {
        this.dashboardService.getDashboards().subscribe(
            res => {
                this.dashboards.privats = res.dashboards.sort((a, b) => (a.config.title > b.config.title) ? 1 : ((b.config.title > a.config.title) ? -1 : 0));
                this.dashboards.publics = res.publics.sort((a, b) => (a.config.title > b.config.title) ? 1 : ((b.config.title > a.config.title) ? -1 : 0));
                this.dashboards.grups = res.group.sort((a, b) => (a.config.title > b.config.title) ? 1 : ((b.config.title > a.config.title) ? -1 : 0));
                this.dashboards.shared = res.shared.sort((a, b) => (a.config.title > b.config.title) ? 1 : ((b.config.title > a.config.title) ? -1 : 0));
                this.groups = _.map(_.uniqBy(res.group, 'group._id'), 'group');

                this.isAdmin = res.isAdmin;

                /**Get unique tags */
                this.tags = Array.from(new Set([].concat.apply([], [...this.dashboards.privats, this.dashboards.publics, this.dashboards.grups, this.dashboards.shared])
                    .map(db => db.config.tag))).sort();
                this.tags = this.tags.map(tag => { return { value: tag, label: tag } })
                this.tags.unshift({ label: this.noTagLabel, value: 0 });
                this.tags.push({ label: this.AllTags, value: 1 });
                this.tags = this.tags.filter(tag => tag.value !== null);
                localStorage.setItem('tags', JSON.stringify(this.tags));
                this.filterDashboards({ label: this.AllTags, value: 1 });

                this.setIsObserver();
            },
            err => this.alertService.addError(err)
        );
    }

    public initDialog(): void {
        this.dashController = new EdaDialogController({
            params: { dataSources: this.dss },
            close: (event, response) => {
                if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
                    this.initDashboards();
                    this.goToDashboard(response);
                }
                this.dashController = undefined;
            }
        });
    }

    public deleteDashboard(dashboard): void {
        let text = $localize`:@@deleteDashboardWarning: Estás a punto de borrar el informe: `;
        Swal.fire({
            title: $localize`:@@Sure:¿Estás seguro?`,
            text: `${text} ${dashboard.config.title}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: $localize`:@@ConfirmDeleteModel:Si, ¡Eliminalo!`,
            cancelButtonText: $localize`:@@DeleteGroupCancel:Cancelar`
        }).then(borrado => {
            if (borrado.value) {
                this.dashboardService.deleteDashboard(dashboard._id).subscribe(
                    () => {
                        Swal.fire($localize`:@@Deleted:¡Eliminado!`, $localize`:@@DashboardDeletedInfo:Informe eliminado correctamente.`, 'success');
                        this.initDashboards();
                    }, err => this.alertService.addError(err)
                );
            }
        });

    }

    public goToDashboard(dashboard): void {
        if (dashboard) {
            this.router.navigate(['/dashboard', dashboard._id]);
        } else {
            this.alertService.addError($localize`:@@ErrorMessage:Ha ocurrido un error`);
        }
    }

    public getGroupsNamesByDashboard(group: any[]): string {
        return group.map((elem: any) => elem.name).join(' , ');
    }

    public filterDashboards(tag: any) {
        this.selectedTag = tag.value;
        if (tag.value === 0) tag.value = null;
        if (tag.value === 1) this.visibleDashboards = _.cloneDeep(this.dashboards);
        else {
            this.visibleDashboards.publics = this.dashboards.publics.filter(db => db.config.tag === tag.value);
            this.visibleDashboards.shared = this.dashboards.shared.filter(db => db.config.tag === tag.value);
            this.visibleDashboards.grups = this.dashboards.grups.filter(db => db.config.tag === tag.value);
            this.visibleDashboards.privats = this.dashboards.privats.filter(db => db.config.tag === tag.value);
        }
    }

}
