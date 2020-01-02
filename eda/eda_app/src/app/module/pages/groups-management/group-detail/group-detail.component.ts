import {Component} from '@angular/core';
import {EdaDialogAbstract} from '@eda_shared/components/eda-dialogs/eda-dialog/eda-dialog-abstract';
import {EdaDialog, EdaDialogCloseEvent} from '@eda_shared/components/eda-dialogs/eda-dialog/eda-dialog';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {GroupService, AlertService, UserService} from '@eda_services/service.index';
import {Group} from '@eda_models/group-model';

@Component({
    selector: 'app-group-detail',
    templateUrl: './group-detail.component.html'
})

export class GroupDetailComponent extends EdaDialogAbstract {
    public dialog: EdaDialog;
    public group: Group;
    public form: FormGroup;
    public lists = {
        avaibles: [],
        selecteds: []
    };
    public roles: any[];
    public imageUpload: File;
    public imageTemp: any;

    constructor( private formBuilder: FormBuilder,
                 private userService: UserService,
                 private groupService: GroupService,
                 private alertService: AlertService) {
        super();

        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
        });

        this.form = this.formBuilder.group({
            name: [null, Validators.required],
            role: [null, Validators.required],
            img: null,
            users: null
        });
    }

    onShow(): void {
        this.load();
    }

    load() {
        this.roles = [{label: 'USER', value: 'user'}, {label: 'ADMIN', value: 'admin'}];
        this.userService.getUsers().subscribe(
            res => {
                this.lists.avaibles = res.users;
            }, err => this.alertService.addError(err)
        );
    }


    selectImage( file: File ) {
        if ( !file ) {
            this.imageUpload = null;
            return;
        }

        if ( file.type.indexOf('image') < 0 ) {
            this.alertService.addError('El archivo seleccionado no es una imagen');
            this.imageUpload = null;
            return;
        }

        this.imageUpload = file;

        const reader = new FileReader();
        const urlImageTemp = reader.readAsDataURL(file);

        reader.onloadend = () => this.imageTemp = reader.result;
    }

    changeImage() {
        this.userService.changeImage( this.imageUpload, this.controller.params.id, 'group');
    }

    closeDialog() {
        this.onClose(EdaDialogCloseEvent.NONE);
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event);
    }
}
