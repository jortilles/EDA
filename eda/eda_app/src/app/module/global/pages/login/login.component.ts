import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { User } from '@eda/models/model.index';
import { UserService } from '@eda/services/service.index';
import Swal from 'sweetalert2';

declare function init_plugins();

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
    email: string;
    remember: boolean;

    constructor(private userService: UserService, private router: Router) {}

    ngOnInit(): void {
        init_plugins();

        this.email = localStorage.getItem('email') || '';

        if (this.email.length > 1) {
            this.remember = true;
        }

    }

    login(form: NgForm) {
        if (form.invalid) {
            return;
        } else {
            const user = new User(null, form.value.email, form.value.password);
            // window.location.href = '#/'
            this.userService.login(user, form.value.remember).subscribe(
                () => this.router.navigate(['/home']),
                err => Swal.fire('Error al iniciar sesión', err.text, 'error')
            );
        }
    }
}
