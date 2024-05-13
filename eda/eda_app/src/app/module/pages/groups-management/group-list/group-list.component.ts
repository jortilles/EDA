import {Component, OnInit} from '@angular/core';
import {UserService, AlertService, GroupService} from '@eda/services/service.index';
import {EdaColumnContextMenu, EdaColumnText, EdaTable} from '@eda/components/component.index';
import {EdaDialogCloseEvent, EdaContextMenuItem, EdaContextMenu, EdaDialogController} from '@eda/shared/components/shared-components.index';
import Swal from 'sweetalert2';
import * as _ from 'lodash';

@Component({
    selector: 'app-group-list',
    templateUrl: './group-list.component.html'
})

export class GroupListComponent implements OnInit {
    public fitxa: EdaDialogController;
    public table: EdaTable;
/* SDA CUSTOM */ public protectedGroups: any = ["135792467811111111111110","135792467811111111111113","135792467811111111111115"]

    constructor( private userService: UserService,
                 private groupService: GroupService,
                 private alertService: AlertService ) {
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
                        command: () => this.fitxa = new EdaDialogController({
                            params: {id: this.table.getContextMenuRow()._id, name: this.table.getContextMenuRow().name},
                            close: (event, response) => this.onCloseFitxa(event, response)
                        })
                    }),
                    new EdaContextMenuItem({
                        label: $localize`:@@deleteCAP:ELIMINAR`,
                        command: () => this.deleteGroup(this.table.getContextMenuRow())
                    })
                ]
            }),
            cols: [
/* SDA CUSTOM*/ new EdaColumnContextMenu({disabled : (row) =>  row.protected, cellStyle}),
/* SDA CUSTOM*/ new EdaColumnText({field: 'name', header: $localize`:@@usersName:NOMBRE`, cellStyle}),
/* SDA CUSTOM*/ new EdaColumnText({field: 'role', header: $localize`:@@usersRole:ROLE`, cellStyle})
            ],
            autolayout:false
        });
    }

    ngOnInit() {
        this.loadGroupList();
    }

    async loadGroupList() {
            let groups = await this.groupService.getGroups().toPromise();
/* SDA CUSTOM*/ for (let group of groups) {
/* SDA CUSTOM*/ group.protected = this.protectedGroups.includes(group._id);
/* SDA CUSTOM*/ }
            this.table.value = groups;
    }

    crateNewGroup() {
        this.fitxa = new EdaDialogController({
            params: {id: null},
            close: (event) => this.onCloseFitxa(event)
        });
    }

    deleteGroup(group) {
        this.table._hideContexMenu();
        Swal.fire({
            title: $localize`:@@DeleteGroup:ELIMINAR GRUPO`,
            text: $localize`:@@DeleteGroupText:Eliminarás todos los elementos relacionados con este grupo, ¿Deseas continuar?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: $localize`:@@DeleteGroupButton:Si, ¡Eliminalo!`,
            cancelButtonText: $localize`:@@DeleteGroupCancel:Cancelar`
        }).then(borrado => {
            if ( borrado.value ) {
                this.groupService.deleteGroup(group._id).subscribe(
                    () => this.table.reload(),
                    err => this.alertService.addError(err)
                );
            }
        });
    }

    onCloseFitxa(event: EdaDialogCloseEvent, response?: any) {
        this.table._hideContexMenu();
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            this.table.reload();
        }

        this.fitxa = undefined;
    }

}
