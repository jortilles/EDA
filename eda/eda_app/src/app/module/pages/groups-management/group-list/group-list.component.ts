import {Component, OnInit} from '@angular/core';
import {UserService, AlertService, GroupService} from '@eda_services/service.index';
import {EdaDialogController} from '@eda_shared/components/eda-dialogs/eda-dialog/eda-dialog-controller';

@Component({
    selector: 'app-group-list',
    templateUrl: './group-list.component.html'
})

export class GroupListComponent implements OnInit {
    public fitxaGroup: EdaDialogController;
    public groups: any[];
    public totalGroups: number;
    public loading: boolean;

    constructor(private userService: UserService,
                private groupService: GroupService,
                private alertService: AlertService) {
    }

    ngOnInit() {
        this.loadGroupList();
    }

    loadGroupList() {
        this.loading = true;
        this.groupService.getGroups().subscribe(
            res => {
                this.groups = res.groups;
                this.totalGroups = res.count;
                this.loading = false;
            }, err => {
                this.alertService.addError(err);
                this.loading = false;
            }
        );
    }

    searchGroup(param: string) {

    }

    deleteGroup(group) {

    }

    changeBetween(num: number) {

    }

    openDialog() {
        this.fitxaGroup = new EdaDialogController({
            params: {},
            close: (event) => {
                this.fitxaGroup = undefined;
            }
        });
    }

}
