import {Component} from '@angular/core';
import {UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import {EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent} from '@eda/shared/components/shared-components.index';
import {AlertService, GroupService, UserService} from '@eda/services/service.index';
import {Group} from '@eda/models/user-models/group-model';
import {IGroup} from '@eda/services/api/group.service';
import * as _ from 'lodash';

@Component({
    selector: 'app-group-detail',
    templateUrl: './group-detail.component.html'
})

export class GroupDetailComponent extends EdaDialogAbstract {
    public dialog: EdaDialog;
    public group: Group;
    public form: UntypedFormGroup;
    public lists = {
        avaibles: [],
        selecteds: []
    };
    public roles: any[];
    public imageUpload: File;
    public imageTemp: any;

    constructor( private userService: UserService,
                 private groupService: GroupService,
                 private alertService: AlertService) {
        super();

        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
            title: 'CREAR NUEVO GRUPO'
        });

        this.form = new UntypedFormGroup({
            name: new UntypedFormControl(null, Validators.required),
            role: new UntypedFormControl(null, Validators.required),
            img: new UntypedFormControl(null),
            users: new UntypedFormControl(null),
        });

        this.roles = [{label: 'USER', value: 'USER_ROLE'}, {label: 'EDA_ADMIN', value: 'ADMIN_ROLE'}];
        this.lists.avaibles = [];
        this.lists.selecteds = [];
    }

    onShow(): void {
        this.load();
    }

    load(): void {
        this.userService.getUsers().subscribe(
            users => {
                this.lists.avaibles = users;
                if (this.controller.params.id) {
                    this.dialog.setTitle(`GRUPO: ${this.controller.params.name}`);
                    this.groupService.getGroup(this.controller.params.id).subscribe(
                        group => {
                            this.group = group;

                            for (const user of group.users) {
                                this.lists.selecteds.push(_.find(this.lists.avaibles, userA => _.isEqual(user._id, userA._id)));
                            }

                            this.lists.avaibles = _.difference(this.lists.avaibles, this.lists.selecteds);
                            this.form.patchValue({name: group.name, role: _.find(this.roles, r => _.isEqual(r.value, group.role))});
                        },
                        err => this.alertService.addError(err)
                    );
                }
            },
            err => this.alertService.addError(err)
        );


    }

    selectImage(file: File): void {
        if (!file) {
            this.imageUpload = null;
            return;
        }

        if (file.type.indexOf('image') < 0) {
            this.alertService.addError('El archivo seleccionado no es una imagen');
            this.imageUpload = null;
            return;
        }

        this.imageUpload = file;

        const reader = new FileReader();
        const urlImageTemp = reader.readAsDataURL(file);

        reader.onloadend = () => this.imageTemp = reader.result;
    }

    save(): void {
        this.form.controls['role'].setValue('USER_ROLE');

        if (this.form.valid) {
            const group: IGroup = {
                name: this.form.value.name,
                role: this.form.value.role,
                img: this.imageUpload,
                users: this.lists.selecteds.map(user => user._id)
            };

            if (!this.controller.params.id) {
                this.groupService.insertGroup(group).subscribe(
                    () => this.onClose(EdaDialogCloseEvent.NEW),
                    err => this.alertService.addError(err)
                );
           } else {
                this.groupService.updateGroup(this.controller.params.id, group).subscribe(
                    () => this.onClose(EdaDialogCloseEvent.UPDATE),
                    err => this.alertService.addError(err)
                );
            }
        }
    }

    closeDialog(): void {
        this.onClose(EdaDialogCloseEvent.NONE);
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event);
    }
}
