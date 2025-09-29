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
import { jwtDecode } from 'jwt-decode';

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

        // Si llega con Single Sing-On
        const qp = this.route.snapshot.queryParamMap;
        const token = qp.get('token');
        const next = qp.get('next') || '/home';

        if (token) {
            
            try {
                const payload = jwtDecode<any>(token);
                const userSAML: User = payload.user;    
                this.userService.savingStorage(userSAML._id, token, userSAML);
            } catch (error) {
                console.log('error', error)
            }
            
            this.router.navigate([next]);
            return;
        }

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

                    console.log('this.returnUrl: ', this.returnUrl);

                    this.router.navigate([this.returnUrl]);
                }
            } catch (err) {
                Swal.fire('Error al iniciar sesión', err.error?.message || 'Ha ocurrido un error inesperado', 'error');
            }
        }
    }

    // Se redirigi al enlace de login de Single Sign-On del Entity Provider
    async loginSSO() {
          try {
            const loginUrl = await lastValueFrom(this.userService.loginUrlSAML());

            const isAvailable = await this.checkUrlAvailability(loginUrl);

            if(!isAvailable){
                Swal.fire(
                    'Single Sign-On',
                    'El servicio de autenticación no está disponible en este momento. Intenta de nuevo más tarde.',
                    'error'
                );
                return;
            }

            window.location.assign(loginUrl); // redirige al login del Entity Provider

        } catch (e:any) {
            Swal.fire('SSO', e?.error?.message || 'No se pudo obtener la URL del Single Sign-On', 'error');
        }
    }

    async checkUrlAvailability(url: string, timeout = 3000):Promise<boolean> {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'no-cors',
                signal: controller.signal
            })

            clearTimeout(timer);

            return response.ok || response.type === 'opaque';

        } catch (error) {
            console.log('No se puede acceder a la URL del Single Sign-On', error);
            return false;
        }
    }

}