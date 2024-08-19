import { GroupService } from './../../../services/api/group.service';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService, DashboardService, SidebarService, StyleProviderService } from '@eda/services/service.index';
import { IGroup } from '@eda/services/api/group.service';
import Swal from 'sweetalert2';
import * as _ from 'lodash';


@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
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
    public IsDataSourceCreator: boolean;
    public toLitle: boolean = false;
    public tags: Array<any> = [];
    public grups: Array<any> = [];
    public isObserver: boolean = false;
    public filteringByName: boolean = false;
    public createDashboard: boolean = false;

    public noTagLabel = $localize`:@@NoTag:Sin Etiqueta`;
    public AllTags = $localize`:@@AllTags:Todos`;
    /* ready  */
    public NoneTags = $localize`:@@NoneTags:Ninguno`;

    constructor(
        private router: Router,
        private dashboardService: DashboardService,
        private sidebarService: SidebarService,
        private alertService: AlertService,
        private groupService: GroupService,
        private stylesProviderService: StyleProviderService
    ) {
        this.sidebarService.getDataSourceNames();
        this.sidebarService.getDataSourceNamesForDashboard();
        this.stylesProviderService.setStyles(this.stylesProviderService.generateDefaultStyles())

        if (window.innerWidth < 1000) {
            this.toLitle = true;
        }

    }

    public ngOnInit() {
        this.initDashboards();
        this.ifAnonymousGetOut();
    }

    private setIsObserver = async () => {
        this.groupService.getGroupsByUser().subscribe(
            res => {
                const user = localStorage.getItem('user');
                const userID = JSON.parse(user)._id;
                this.grups = res;
                this.isObserver = this.grups.filter(group => group.name === 'EDA_RO' && group.users.includes(userID)).length !== 0
            },
            (err) => this.alertService.addError(err)
        );
    }

    private ifAnonymousGetOut(): void {
        const user = localStorage.getItem('user');
        const userName = JSON.parse(user).name;

        if (userName === 'edaanonim' || userName === 'EDA_RO') {
            this.router.navigate(['/login']);
        }
    }

    private async initDashboards(): Promise<void> {
        try {
            this.visibleDashboards = {
                publics: [],
                privats: [],
                grups: [],
                shared: []
            };
            
            const res = await this.dashboardService.getDashboards().toPromise();
            this.dashboards.privats = res.dashboards.sort((a, b) => (a.config.title > b.config.title) ? 1 : ((b.config.title > a.config.title) ? -1 : 0));
            this.dashboards.publics = res.publics.sort((a, b) => (a.config.title > b.config.title) ? 1 : ((b.config.title > a.config.title) ? -1 : 0));
            this.dashboards.grups = res.group.sort((a, b) => (a.config.title > b.config.title) ? 1 : ((b.config.title > a.config.title) ? -1 : 0));
            this.dashboards.shared = res.shared.sort((a, b) => (a.config.title > b.config.title) ? 1 : ((b.config.title > a.config.title) ? -1 : 0));
            this.groups = _.map(_.uniqBy(res.group, 'group._id'), 'group');
            
            this.isAdmin = res.isAdmin;
            this.IsDataSourceCreator = res.isDataSourceCreator;
            /**Get unique tags */
            /* normalitzem els diferents tags */
            const tagsA = Array.from(new Set([].concat.apply([], [...this.dashboards.privats, this.dashboards.publics, this.dashboards.grups, this.dashboards.shared])
                .map(db => db.config.tag))).sort();
            const tagsC = []
            tagsA.forEach(a => {
                if (typeof a == 'string') {
                    tagsC.push(a);
                } else if (Array.isArray(a)) {
                    a.forEach(b => tagsC.push(b))
                }
            })
            this.tags = tagsC; 
            this.tags = this.tags.filter(tag => tag !== null);
            this.tags = this.tags.filter(tag => tag !== undefined);
            this.tags.unshift({ label: this.noTagLabel, value: 0 }); //afegim el "sense etiqueta"
            this.tags.push({ label: this.AllTags, value: 1 }); //afegim el "totes les etiquetes"
            this.tags = this.tags.filter(tag => tag.value !== null);
            for (let i=0;i<this.tags.length;i++){ //assegurem si entra un string, que es converteixi en clau valor
                if (typeof this.tags[i] === 'string') {
                    this.tags[i] = { label: this.tags[i], value: this.tags[i] }
                }
            }
            this.tags = _.uniqBy(this.tags, 'value'); //treiem repetits
            localStorage.setItem('tags', JSON.stringify(this.tags)); //IMPORTANT, guardem tags per sessió! Els recuperem a cada dashboard
            this.filterDashboards({ label: this.AllTags, value: 1 });
            this.setIsObserver();
        } catch (err) {
            this.alertService.addError(err);
            throw err;
        }
        
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
        }).then(async (borrado) => {
            if (borrado.value) {
                try {
                    await this.dashboardService.deleteDashboard(dashboard._id).toPromise();
                    Swal.fire($localize`:@@Deleted:¡Eliminado!`, $localize`:@@DashboardDeletedInfo:Informe eliminado correctamente.`, 'success');
                    this.initDashboards();
                } catch (err) {
                    this.alertService.addError(err);
                    throw err;
                }
            }
        });

    }

    public getGroupsNamesByDashboard(group: any[]): string {
        return group.map((elem: any) => elem.name).join(' , ');
    }

    public filterDashboards(tag: any) {
        this.selectedTag = tag.value;
        if (tag.value === 0) tag.value = null;
        if (tag.value === 1) this.visibleDashboards = _.cloneDeep(this.dashboards); 
        else {
            const publicsTags = this.tagExtractor(this.dashboards.publics, this.selectedTag)
            this.visibleDashboards.publics = this.dashboards.publics.filter(db => publicsTags.includes(db))
            const sharedTags = this.tagExtractor(this.dashboards.shared, this.selectedTag)
            this.visibleDashboards.shared = this.dashboards.shared.filter((db: any) => sharedTags.includes(db));
            const grupsTags = this.tagExtractor(this.dashboards.grups, this.selectedTag)
            this.visibleDashboards.grups = this.dashboards.grups.filter((db: any) =>  grupsTags.includes(db));
            const privatsTags = this.tagExtractor(this.dashboards.privats, this.selectedTag)
            this.visibleDashboards.privats = this.dashboards.privats.filter(db =>  privatsTags.includes(db) );
        }
    }
    
    tagExtractor = (dashboardList, tag) => {
        let dbList = []
        dashboardList.forEach(a => {
                if ( tag === a.config.tag) {
                    dbList.push(a)
                } else if (Array.isArray(a.config.tag) && a.config.tag.includes(tag)){
                    dbList.push(a)
                }
            })
            return dbList;
        }       

    public goToDashboard(dashboard): void {
        if (dashboard) {
            this.router.navigate(['/dashboard', dashboard._id]);
        } else {
            this.alertService.addError($localize`:@@ErrorMessage:Ha ocurrido un error`);
        }
    }
    

    public filterTitle(text: any){
        const stringToFind = text.target.value.toString().toUpperCase();
        if(stringToFind.length >  1) {
            this.visibleDashboards.publics = this.dashboards.publics.filter((db: any) => db.config.title.toUpperCase().indexOf(  stringToFind)>=0 );
            this.visibleDashboards.shared = this.dashboards.shared.filter((db: any) => db.config.title.toUpperCase().indexOf(  stringToFind)>=0 );
            this.visibleDashboards.grups = this.dashboards.grups.filter((db: any) => db.config.title.toUpperCase().indexOf(  stringToFind)>=0 );
            this.visibleDashboards.privats = this.dashboards.privats.filter((db: any) =>db.config.title.toUpperCase().indexOf(  stringToFind)>=0 );
            this.filteringByName = true;
        }else{
            this.visibleDashboards = _.cloneDeep(this.dashboards);
            if(stringToFind.length == 0) {
                this.filteringByName = false;
            }
        }
    }


    public canIEdit( dashboard ) {
        let result: boolean = false;
        result = this.isAdmin ;
        if (result == false) {
            if (dashboard.config.onlyIcanEdit === true) {
                if ( localStorage.getItem('user')  ==  dashboard.user) {
                    result = true;
                }
            } else {
                result = true;
            }

        }
        return result;
    }

    public onCloseCreateDashboard(event?: any): void {
        this.createDashboard = false;
        if (event) this.router.navigate(['/dashboard', event._id]);
    }



}
