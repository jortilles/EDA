import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LogoImage, SubLogoImage, BackgroundImage } from '@eda/configs/index';
import { ParticlesBackgroundComponent } from '@eda/shared/components/particles-background/particles-background';
import { UserService } from '@eda/services/service.index';
import { User } from '@eda/models/model.index';
import { lastValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
declare function init_plugins();
@Component({
    selector: 'app-loginv2',
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule, ParticlesBackgroundComponent],
    templateUrl: './login_v2.html',
    styleUrls: ["./login_v2.scss"],
})
export class LoginV2Component implements OnInit {
    readonly logo = LogoImage
    readonly subLogo = SubLogoImage
    readonly backgroundImage = BackgroundImage
    readonly currentYear = new Date().getFullYear().toString()

    loginForm: FormGroup;
    urlParams: any;
    returnUrl: string;

    private fb = inject(FormBuilder);
    private userService = inject(UserService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    constructor() {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required]],
            password: ['', Validators.required],
            remember: [false]
        });
    }

    ngOnInit(): void {
        init_plugins();

        this.route.queryParamMap.subscribe(params => this.urlParams = JSON.parse(JSON.stringify(params)).params.params);

        this.returnUrl = this.route.snapshot.queryParams["returnUrl"] || "/home";

        const savedEmail = localStorage.getItem("email");
        if (savedEmail) {
          this.loginForm.patchValue({ email: savedEmail, remember: true });
        }
    }

    async onSubmitLogin() {
        if (this.loginForm.valid) {
            try {
                const { email, password, remember } = this.loginForm.value;
                const user = new User(null, email, password);

                await lastValueFrom(this.userService.login(user, remember));

                if (this.urlParams) {
                    const params = this.urlParams.split('&');
                    let newParams: { [key: string]: string } = {};

                    for (const param of params) {
                        const [key, value] = param.split('=');
                        if (value.includes('%7C')) {
                            newParams[key] = value.split('%7C').join('|');
                        } else {
                            newParams[key] = value;
                        }
                    }

                    this.router.navigate([this.returnUrl], { queryParams: newParams });
                } else {
                    this.router.navigate([this.returnUrl]);
                }
            } catch (err) {
                Swal.fire('Error al iniciar sesión', err.error?.message || 'Ha ocurrido un error inesperado', 'error');
            }
        }
    }
}