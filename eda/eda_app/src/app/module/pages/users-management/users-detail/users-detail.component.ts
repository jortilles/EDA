import { Component } from '@angular/core';
import {UntypedFormBuilder, FormControl, UntypedFormGroup, Validators} from '@angular/forms';
import { AlertService, GroupService, UserService } from '@eda/services/service.index';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import Swal from 'sweetalert2';
import * as _ from 'lodash';


@Component({
    selector: 'app-users-detail',
    templateUrl: './users-detail.component.html'
})

export class UsersFitxaComponent extends EdaDialogAbstract {
    private iam: boolean;
    public dialog: EdaDialog;
    public form: UntypedFormGroup;
    public user: any = {};
    public roles: any[] = [];
    public btnLabel: string;

    constructor( private userService: UserService,
                 private groupService: GroupService,
                 private alertService: AlertService,
                 private fb: UntypedFormBuilder) {
        super();

        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
            title: $localize`:@@newUserTitle:CREAR NUEVO USUARIO`,
            style :  { width: '80%', height: '70%', top:"-4em", left:'1em'}
        });

        this.form = this.fb.group({
            name: [null, Validators.required],
            email: [null, [Validators.required]],
            password: [null, Validators.nullValidator],
            rpassword: [null, Validators.nullValidator],
            role: [[], Validators.nullValidator]
        });
    }

    onShow(): void {
        this.loadDetail();
    }

    async loadDetail() {
        this.btnLabel = 'REGISTRAR';
        await this.loadGroups();

        if (this.controller.params.id) {

            let title = $localize`:@@userDetailHeader: USUARIO`
            this.dialog.setTitle(`${title} - ${_.toUpper(this.controller.params.name)}`);
            this.btnLabel = $localize`:@@userDetailSaveButton:GUARDAR`;
            //this.form.controls['password'].disable({ onlySelf: true })
            this.loadUser();
        }
    }

    loadUser() {
        this.userService.getUser(this.controller.params.id).subscribe(
            res => {
                const user = res.user;
                this.form.patchValue({name: user.name, email: user.email, password: user.password, rpassword:user.password});
                
                const rolesNames = [];
                for (const userRole of user.role) {
                    for (const role of this.roles) {
                        if (userRole._id === role._id) {
                            rolesNames.push(role);
                        }
                    }
                }

                this.form.get('role').setValue(rolesNames);

                this.iam = user.email === JSON.parse(localStorage.getItem('user')).email;
            }, err => this.alertService.addError(err)
        );
    }

    loadGroups(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.groupService.getGroups().subscribe(
                groups => {
                    this.roles = groups.map(g => ({_id: g._id, name: g.name, role: g.role}));
                    resolve(true);
                },
                err => {
                    this.alertService.addError(err);
                    reject(err);
                }
            );
        });
    }

    saveUser() {
        if (this.form.invalid) {
            this.alertService.addError($localize`:@@IncorrectForm:Formulario incorrecto. Revise los campos obligatorios.`);
        } else {
            const form = this.form.value;
            this.user.name = form.name;
            this.user.email = form.email;
            this.user.role = form.role;
            if(form.password != ':)'){
                this.user.password = form.password;
            }
            if (this.controller.params.id) {
                this.user._id = this.controller.params.id;
                if (this.iam) {
                    this.userService.updateUser(this.user).subscribe(
                        () =>  this.onClose(EdaDialogCloseEvent.UPDATE),
                        err => this.alertService.addError(err)
                    );
                } else if (!this.iam) {
                    this.userService.manageUpdateUsers(this.user).subscribe(
                        (res) => {
                            this.onClose(EdaDialogCloseEvent.UPDATE);
                            Swal.fire($localize`:@@UpdatedUser:Usuario actualizado`, res.email, 'success');
                        },
                        err => this.alertService.addError(err)
                    );
                }
            } else {
                if (!this.isMatch('password', 'rpassword')) {
                    return this.alertService.addWarning($localize`:@@PasswordsNotEqual:Las contraseñas no coinciden`);
                }
                this.user.password = form.password;
                this.userService.createUser(this.user).subscribe(
                    res => {
                        this.onClose(EdaDialogCloseEvent.NEW);
                        Swal.fire($localize`:@@CreatedUser:Usuario creado`, res.email, 'success');
                    }, err => {
                        Swal.fire($localize`:@@RegisterError:Error al registrarse`, err.text, 'error');
                    }
                );
            }
        }
    }

    isMatch(value1: string, value2: string): boolean {
        const pass1 = this.form.controls[value1].value;
        const pass2 = this.form.controls[value2].value;

        return pass1 === pass2;
    }

    closeDialog() {
        this.onClose(EdaDialogCloseEvent.NONE);
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }

}
