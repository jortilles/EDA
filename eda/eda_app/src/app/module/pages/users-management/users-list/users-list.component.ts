import { Component, OnInit } from '@angular/core';
import { User } from '@eda/models/user-models/user.model';
import { EdaContextMenu, EdaContextMenuItem, EdaDialogCloseEvent, EdaDialogController } from '@eda/shared/components/shared-components.index';
import { EdaTable, EdaColumnText, EdaColumnContextMenu } from '@eda/components/component.index';
import { UserService, AlertService, SpinnerService } from '@eda/services/service.index';
import Swal from 'sweetalert2';
import * as _ from 'lodash';

@Component({
    selector: 'app-users-list',
    templateUrl: './users-list.component.html',
    styles: []
})
export class UsersLlistaComponent implements OnInit {
    public userFitxa: EdaDialogController;
    public table: EdaTable;
    public users: User[] = [];
/* SDA CUSTOM */ public protectedUsers: any = ["135792467811111111111111","135792467811111111111112"]


    constructor( private userService: UserService,
                 private spinnerService: SpinnerService,
                 private alertService: AlertService) {
/* SDA CUSTOM*/         let cellStyle = (value, row) => {
/* SDA CUSTOM*/             let style: any = {};
/* SDA CUSTOM*/             if (row.protected) style = { opacity: '0.5' };
/* SDA CUSTOM*/             return style;          
/* SDA CUSTOM*/         };            
        this.table = new EdaTable({
            alertService: this.alertService,
            search: true,
            contextMenu: new EdaContextMenu({
                header: $localize`:@@rowOptions:OPCIONES DE LA FILA`,
                contextMenuItems: [
                    new EdaContextMenuItem({
                        label: $localize`:@@EDITCAP:EDITAR`,
                        command: () => this.userFitxa = new EdaDialogController({
                            params: {id: this.table.getContextMenuRow()._id, name: this.table.getContextMenuRow().name},
                            close: (event, response) => this.onCloseFitxa(event, response)
                        })
                    }),
                    new EdaContextMenuItem({label: 'ELIMINAR', command: () => this.deleteUser(this.table.getContextMenuRow())})
                ]
            }),
            cols: [
/* SDA CUSTOM*/ new EdaColumnContextMenu({disabled : (row) =>  row.protected, cellStyle}),
/* SDA CUSTOM*/ new EdaColumnText({field: 'email', header: $localize`:@@groups1:EMAIL`, cellStyle }),
/* SDA CUSTOM*/ new EdaColumnText({field: 'role',  header: $localize`:@@groups2:GRUPOS`, cellStyle}),
/* SDA CUSTOM*/ new EdaColumnText({field: 'auth',  header: $localize`:@@groups3:AUTH`, cellStyle})
            ],
            autolayout:false
        });
    }

    ngOnInit() {
        this.loadUsers();
    }

    loadUsers() {
        this.userService.getUsers().subscribe(
            users => {
                for (const user of users) {
                    const stringGroups = [];
                    stringGroups.push(_.map(user.role, 'name'));
                    user.role = stringGroups.join(', ');
/* SDA CUSTOM */    user.protected = this.protectedUsers.includes(user._id); //introducimos el valor de los usuarios protegidos
                }
                this.table.value = users;
            }
            , (err) => {
                this.alertService.addError(err)
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
        if (user._id === this.userService.getUserObject()._id) {
            Swal.fire($localize`:@@cantDeleteUser:No se puede borrar el usuario`, $localize`:@@cantSelfDelete:No se puede borrar a si mismo`, 'error');
            return;
        }
        let title = $localize`:@@DeleteUserMessage:Estás a punto de borrar el usuario `
        Swal.fire({
            title: $localize`:@@Sure:¿Estás seguro?`,
            text: `${title} ${user.name}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: $localize`:@@DeleteUser:Si, ¡Bórralo!`
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
