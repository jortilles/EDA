import { Component, inject, OnInit, AfterViewChecked, NgZone, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LogoImage, SubLogoImage, BackgroundImage } from '@eda/configs/index';
import { ParticlesBackgroundComponent } from '@eda/shared/components/particles-background/particles-background';
import { UserService } from '@eda/services/service.index';
import { User } from '@eda/models/model.index';
import { lastValueFrom } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { GOOGLE_CLIENT_ID } from '@eda/configs/config';
import { MsalModule, MsalService } from '@azure/msal-angular';
import Swal from 'sweetalert2';



// Variable Google
declare var google: any;


declare function init_plugins();
@Component({
    selector: 'app-loginv2',
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule, ParticlesBackgroundComponent, MsalModule],
    templateUrl: './login.html',
    styleUrls: ["./login.scss"],
})
export class LoginV2Component implements OnInit, AfterViewChecked {


    @ViewChild('googleBtn', { static: false }) googleBtn?: ElementRef<HTMLDivElement>;

    readonly logo = LogoImage
    readonly subLogo = SubLogoImage
    readonly backgroundImage = BackgroundImage
    readonly currentYear = new Date().getFullYear().toString()

    loginForm: FormGroup;
    urlParams: any;
    returnUrl: string;
    singleSignOnSamlMixOrclAvailable : boolean = false;
    singleSignOnSamlAvailable : boolean = false;
    singleSignOnGoogleAvailable : boolean = false;
    singleSignOnMicrosoftAvailable : boolean = false;

    private googleInitialized = false;        // Initialize google.accounts.id only once
    private googleButtonRendered = false;     // Avoid multiple rendering

    private fb = inject(FormBuilder);
    private userService = inject(UserService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private ngZone = inject(NgZone)
    private msalService = inject(MsalService);

    constructor() {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required]],
            password: ['', Validators.required],
            remember: [false]
        });
    }

    ngOnInit(): void {
        init_plugins();

        // Starting the multiple Login
        this.getInitLoginType();

        this.route.queryParamMap.subscribe(params => this.urlParams = JSON.parse(JSON.stringify(params)).params.params);
        this.returnUrl = this.route.snapshot.queryParams["returnUrl"] || "/home";

        const savedEmail = localStorage.getItem("email");
        if (savedEmail) {
          this.loginForm.patchValue({ email: savedEmail, remember: true });
        }

    }

    ngAfterViewChecked(): void {
        // Google button check
        if(this.singleSignOnGoogleAvailable && this.googleBtn && !this.googleButtonRendered) {
            this.googleButtonRendered = true;
            this.initGoogleSignIn(); // Initialize and render the Google button
        }
    }

    // Initialization function for all alternative logins
    getInitLoginType() {
        this.userService.getLoginType()
            .subscribe((resp => {

                if(resp?.type === "sso_mixto") {
                    this.singleSignOnSamlMixOrclAvailable = true;
                    this.verifyloginSamlMixOrcl();
                    return
                }

                if(resp?.type === "sso") {

                    // Login methods => saml google microsoft
                    const loginMethods = resp.options.elements;

                    if(loginMethods.includes("saml")) {
                        this.singleSignOnSamlAvailable = true;
                        this.verifyloginSaml();
                    }
                    
                    if(loginMethods.includes("google")) {
                        this.singleSignOnGoogleAvailable = true;
                    }

                    if(loginMethods.includes("microsoft")) {
                        this.singleSignOnMicrosoftAvailable = true;
                    }
                    
                    return;
                }
        }))
    }

    // Native Login
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

    // Microsoft Login
    async loginMicrosoft() {
        try {
            await this.msalService.instance.initialize();

            this.msalService.loginPopup({
                    scopes: ['User.Read'] // Configuration in the application - Jortilles Web EDA
                }).subscribe({
                    next: (respMicrosoft) => {
                    this.userService.responseMicrosoft(respMicrosoft).subscribe((res) => {
                        this.ngZone.run(() => this.router.navigate([this.returnUrl]))
                    }, err => {
                        console.log('err: ',err)
                    })
                    },
                    error: (error) => console.log('error: ',error)
                });
            
        } catch (error) {
            console.error('MSAL Initialization Error:', error);
        }

    }

    // Google Login
    loginGoogle(respGoogle:any) {
        this.userService.credentialGoogle(respGoogle).subscribe(
            () => {
                // we use ngZone because of the callback generated by google
                // it is a function outside the Angular environment.
                // console.log('respGoogle: ',respGoogle)
                this.ngZone.run(() => this.router.navigate([this.returnUrl]))
            }, err => {
                console.log('err: ',err);
            }
        )
    }

    // Google button initialization and design
    private initGoogleSignIn(){
        if(!this.googleInitialized) this.googleInitialized = true;
        try {
            // Google callback
            google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID, // hide in Angular
            callback: (dataGoogle:any) => {this.loginGoogle(dataGoogle);}
        });
        } catch (error) {
            console.error('Error al inicializar elGoogle ID:', error);
        }

        if(this.googleBtn?.nativeElement) {
            try {
                // Google button configuration
                google.accounts.id.renderButton(document.getElementById("google-btn"),
                {
                    theme: 'filled_white',
                    size: 'medium',
                    shape: 'square',
                    text: 'continue_with',
                    width: 389
                });
            } catch (error) {
                console.error('Error al renderizar el botón de google:', error);
            }
        }

    }

    // Redirect to Entity Provider => Single Sign-On SAML & Oracle Login
    async loginButtonSSOMixOrcl() {
          try {
            const loginUrl = await lastValueFrom(this.userService.loginUrlSAMLmixOrcl());

            const isAvailable = await this.checkUrlAvailability(loginUrl);

            if(!isAvailable){
                Swal.fire(
                    'Single Sign-On',
                    'El servicio de autenticación no está disponible en este momento. Intenta de nuevo más tarde.',
                    'error'
                );
                return;
            }

            window.location.assign(loginUrl); // redirect to the Entity Provider login

        } catch (e:any) {
            Swal.fire('SSO', e?.error?.message || 'No se pudo obtener la URL del Single Sign-On', 'error');
        }
    }

    // (Verification) => Redirect to Entity Provider => Single Sign-On SAML & Oracle Login
    verifyloginSamlMixOrcl() {
        // If arriving via Single Sign-On
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
                Swal.fire('Error al iniciar sesión', error.error?.message || 'Ha ocurrido un error inesperado', 'error');
            }
            
            this.router.navigate([next]);
            return;
        }
    }

    // Redirect to Entity Provider => Single Sign-On SAML Login
    async loginButtonSSO() {
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

            window.location.assign(loginUrl); // redirect to the Entity Provider login

        } catch (e:any) {
            Swal.fire('SSO', e?.error?.message || 'No se pudo obtener la URL del Single Sign-On', 'error');
        }
    }

    // (Verification) => Redirect to Entity Provider => Single Sign-On SAML Login
    verifyloginSaml() {
        // If arriving via Single Sign-On
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
                Swal.fire('Error al iniciar sesión', error.error?.message || 'Ha ocurrido un error inesperado', 'error');
            }
            
            this.router.navigate([next]);
            return;
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