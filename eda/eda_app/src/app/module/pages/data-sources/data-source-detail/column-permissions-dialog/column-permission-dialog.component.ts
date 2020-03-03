import { Component } from '@angular/core';
import { EdaDialogAbstract, EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { DataSourceService, QueryBuilderService, QueryParams, UserService } from '@eda/services/service.index';


@Component({
    selector: 'app-column-permission-dialog',
    templateUrl: './column-permission-dialog.component.html'
})

export class ColumnPermissionDialogComponent extends EdaDialogAbstract {

    public dialog: EdaDialog;

    /*model */
    public dbModel: any;

    /* MultiSelects Vars */
    public users: Array<object>;
    public selectedUsers: Array<any>;

    public roles: Array<object>;
    public selectedRoles: Array<any>;

    public values: Array<object>;
    public selectedValues: Array<any>;

    /* filterProps */
    private table: any;
    private column: any;


    constructor(private dataSourceService: DataSourceService,
                private queryBuilderService: QueryBuilderService,
                private userService: UserService) {
        super();

        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
            title: ''
        });
    }

    onShow() {
        this.load();
    }

    load() {
        this.table = this.dataSourceService.getModel().filter(t => t.table_name === this.controller.params.table.technical_name)[0];

        this.column = this.table.columns.filter(c => c.column_name === this.controller.params.column.technical_name)[0];
        this.loadDataSource();
        this.loadUsers();
    }

    loadDataSource() {
        const queryParams: QueryParams = {
            table: this.controller.params.table.technical_name,
            dataSource: this.dataSourceService.model_id,
        };
        this.dataSourceService.executeQuery(
            this.queryBuilderService.simpleQuery(this.column, queryParams)
        ).subscribe(
            res => this.values = res[1].map(item => ({ label: item[0], value: item[0] })),
            err => console.log(err)
        );
    }

    loadUsers() {
        this.userService.getUsers().subscribe(
            res => this.users = res.map(user => ({label: user.name, value: user})),
            err => console.log(err)
        );
    }

    savePermission() {
        const permissionFilter = {
            users : this.selectedUsers.map(usr => usr._id),
            usersName : this.selectedUsers.map(usr => usr.name),
            value : this.selectedValues,
            table : this.table.table_name,
            column : this.column.column_name
        };
        this.onClose(EdaDialogCloseEvent.NEW, permissionFilter);
    }

    closeDialog() {
        this.selectedUsers = [];
        this.selectedValues = [];
        this.onClose(EdaDialogCloseEvent.NONE);
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }
}
