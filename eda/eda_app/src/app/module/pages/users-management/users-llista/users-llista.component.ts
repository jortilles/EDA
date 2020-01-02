import { Component, OnInit } from '@angular/core';
import { User } from '@eda_models/user.model';
import {EdaContextMenu, EdaContextMenuItem, EdaDialogCloseEvent, EdaDialogController} from '@eda_shared/components/shared-components.index';
import { EdaTable, EdaColumnText, EdaColumnContextMenu, EdaColumnFilterMultiSelect } from '@eda_components/component.index';
import { UserService, AlertService, SpinnerService } from '@eda_services/service.index';
import Swal from 'sweetalert2';
import * as _ from 'lodash';

@Component({
    selector: 'app-users-llista',
    templateUrl: './users-llista.component.html',
    styles: []
})
export class UsersLlistaComponent implements OnInit {
    public userFitxa: EdaDialogController;
    public table: EdaTable;
    public users: User[] = [];

    public totalUsers: number = 0;


    constructor( private userService: UserService,
                 private spinnerService: SpinnerService,
                 private alertService: AlertService) {

        this.table = new EdaTable({
            alertService: this.alertService,
            contextMenu: new EdaContextMenu({
                header: 'OPCIONES DE LA FILA',
                contextMenuItems: [
                    new EdaContextMenuItem({
                        label: 'EDITAR',
                        command: () => this.userFitxa = new EdaDialogController({
                            params: {id: this.table.getContextMenuRow()._id, name: this.table.getContextMenuRow().name},
                            close: (event, response) => this.onCloseFitxa(event, response)
                        })
                    }),
                    new EdaContextMenuItem({label: 'ELIMINAR', command: () => this.deleteUser(this.table.getContextMenuRow())})
                ]
            }),
            cols: [
                new EdaColumnContextMenu(),
                new EdaColumnText({field: 'name',  header: 'NOMBRE', filter: new EdaColumnFilterMultiSelect()}),
                new EdaColumnText({field: 'email', header: 'EMAIL'}),
                new EdaColumnText({field: 'role',  header: 'ROLE'}),
                new EdaColumnText({field: 'auth',  header: 'AUTH'})
            ]
        });
    }

    ngOnInit() {
        this.loadUsers();
    }

    loadUsers() {
        this.userService.getUsers().subscribe(
            res => {
                this.table.value = res.users;
                this.totalUsers = res.count;
            }, err => {
                this.alertService.addError(err);
            }
        );
    }

    crateNewUser() {
        this.userFitxa = new EdaDialogController({
            params: {id: null},
            close: (event) => this.onCloseFitxa(event)
        });
    }

    deleteUser(user: User) {
        this.table._hideContexMenu();
        if (user._id === this.userService.user._id) {
            Swal.fire('No se puede borrar el usuario', 'No se puede borrar a si mismo', 'error');
            return;
        }

        Swal.fire({
            title: '¿Estas seguro?',
            text: `Estas a punto de borrar el usuario ${user.name}`,
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Si, borralo!'
        }).then(borrado => {
            if (borrado.value === true) {
                this.userService.deleteUser(user._id).subscribe(
                    () => this.loadUsers(),
                    err => this.alertService.addError(err)
                );
            }
        });
    }

    onCloseFitxa(event: EdaDialogCloseEvent, response?: any) {
        this.table._hideContexMenu();
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            this.loadUsers();
        }

        this.userFitxa = undefined;
    }
}
