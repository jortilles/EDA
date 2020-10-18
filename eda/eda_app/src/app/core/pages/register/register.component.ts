import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { UserService, AlertService } from '@eda/services/service.index';
import { EdaDialogController } from '@eda/shared/components/eda-dialogs/eda-dialog/eda-dialog-controller';
import { User } from '@eda/models/model.index';
import Swal from 'sweetalert2';

declare function init_plugins();

@Component({
    selector: 'app-register',
    templateUrl: './register.component.html',
    styleUrls: ['../login/login.component.css']
})
export class RegisterComponent implements OnInit {

    form: FormGroup;
    conditions: EdaDialogController;

    constructor(
        private userService: UserService,
        private router: Router,
        private alertService: AlertService
    ) {
        this.form = new FormGroup({
            name: new FormControl(null, Validators.required),
            email: new FormControl(null, [Validators.required, Validators.email]),
            password: new FormControl(null, Validators.required),
            password2: new FormControl(null, Validators.required),
            terminos: new FormControl(false),
        }, { validators: this.isMatch('password', 'password2') });
    }

    ngOnInit() {
        init_plugins();
    }

    isMatch(value1: string, value2: string) {

        return (group: FormGroup) => {

            const pass1 = group.controls[value1].value;
            const pass2 = group.controls[value2].value;

            if (pass1 === pass2) {
                return null;
            }

            return {
                isMatch: true
            };
        };
    }

    registrarUser() {
        if (this.form.invalid) {
            this.alertService.addError($localize`:@@IncorrectForm:Formulario incorrecto. Revise los campos obligatorios.`);
        } else if (this.form.value.terminos === false) {
            Swal.fire({ title: $localize`:@@ImportantMessage:Importante`, text: $localize`:@@AcceptConditions:Debe de aceptar las condiciones`, type: 'warning' });
        } else {
            const user = new User(this.form.value.name, this.form.value.email, this.form.value.password);

            this.userService.createUser(user).subscribe(
                res => {
                    this.router.navigate(['/login']);
                    Swal.fire($localize`:@@UserCreated:Usuario creado`, res.email, 'success');
                }, err => {
                    Swal.fire($localize`:@@RegisterError:Error al registrarse`, err.text, 'error');
                }
            );
        }
    }

    conditionsDialog() {
        this.conditions = new EdaDialogController({
            close: (event) => {
                this.conditions = undefined;
            }
        });
    }

}
