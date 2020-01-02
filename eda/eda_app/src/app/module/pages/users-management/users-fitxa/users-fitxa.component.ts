import {Component} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {User} from '@eda_models/user.model';
import {AlertService, UserService} from '@eda_services/service.index';
import {EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent} from '@eda_shared/components/shared-components.index';
import Swal from 'sweetalert2';
import * as _ from 'lodash';
import {compilerIsNewStylingInUse} from '@angular/compiler/src/render3/view/styling_state';

@Component({
    selector: 'app-users-fitxa',
    templateUrl: './users-fitxa.component.html'
})

export class UsersFitxaComponent extends EdaDialogAbstract {
    public user: any = {};
    public dialog: EdaDialog;
    public form: FormGroup;
    public btnLabel: string;

    constructor( private userService: UserService,
                 private alertService: AlertService) {
        super();

        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
            title: 'CREAR NUEVO USUARIO'
        });

        this.form = new FormGroup({
            name: new FormControl(null, Validators.required),
            email: new FormControl(null, [Validators.required, Validators.email]),
            password: new FormControl(null, Validators.required),
            role: new FormControl('USER_ROLE', Validators.required),
        });
    }

    onShow(): void {
        if (this.controller.params.id) {
            this.form.controls['password'].disable();
            this.dialog.title = `USUARIO - ${_.toUpper(this.controller.params.name)}`;
            this.btnLabel = 'GUARDAR';
            this.userService.getUser(this.controller.params.id).subscribe(
                res => {
                    const user = res.user;
                    this.form.patchValue({name: user.name, email: user.email, password: user.password, role: user.role});
                }, err => this.alertService.addError(err)
            );
        } else {
            this.btnLabel = 'REGISTRAR';
        }
    }

    registrarUser() {
        if (this.form.invalid) {
            this.alertService.addError(`Formulario incorrecto. Revise los campos obligatorios.`);
        } else {
            const form = this.form.value;
            this.user.name = form.name;
            this.user.email = form.email;
            this.user.role = form.role;
            if (this.controller.params.id) {
                this.user._id = this.controller.params.id;
                this.userService.updateUser(this.user).subscribe(
                    () => {
                        this.onClose(EdaDialogCloseEvent.UPDATE);
                    },
                    err => {
                        this.alertService.addError(err);
                    }
                );
            } else {
		this.user.password = form.password;
                this.userService.createUser(this.user).subscribe(
                    res => {
                        this.onClose(EdaDialogCloseEvent.NEW);
                        Swal.fire('Usuario creado', res.email, 'success');
                    }, err => {
                        Swal.fire('Error al registrarse', err.text, 'error');
                    }
                );
            }
        }
    }

    closeDialog() {
        this.onClose(EdaDialogCloseEvent.NONE);
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }

}
