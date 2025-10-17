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
    templateUrl: './login_v2.html',
    styleUrls: ["./login_v2.scss"],
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

    private googleInitialized = false;        // Inicia google.accounts.id una sola vez
    private googleButtonRendered = false;     // Evita multiple renderizado

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

        // Iniciando el Login multiple
        this.getInitLoginType();

        this.route.queryParamMap.subscribe(params => this.urlParams = JSON.parse(JSON.stringify(params)).params.params);
        this.returnUrl = this.route.snapshot.queryParams["returnUrl"] || "/home";

        const savedEmail = localStorage.getItem("email");
        if (savedEmail) {
          this.loginForm.patchValue({ email: savedEmail, remember: true });
        }

    }

    ngAfterViewChecked(): void {
        // Verificación del botón de google
        if(this.singleSignOnGoogleAvailable && this.googleBtn && !this.googleButtonRendered) {
            this.googleButtonRendered = true;
            this.initGoogleSignIn(); // Inicializa y renderiza el botón de google
        }
    }

    // Función de inicialización de todos los login alternativos
    getInitLoginType() {
        this.userService.getLoginType()
            .subscribe((resp => {

                console.log('resp:::: ', resp);

                if(resp?.type === "sso_mixto") {
                    this.singleSignOnSamlMixOrclAvailable = true;
                    this.verifyloginSamlMixOrcl();
                    return
                }

                if(resp?.type === "sso") {

                    // Metodos de login => saml google microsoft
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

    // Login Nativo
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

    // Login Microsoft
    async loginMicrosoft() {
        try {
            await this.msalService.instance.initialize();

            this.msalService.loginPopup({
                    scopes: ['User.Read'] // Configuración en la aplicación de - Jortilles Web EDA
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

    // Login Google
    loginGoogle(respGoogle:any) {
        this.userService.credentialGoogle(respGoogle).subscribe(
            () => {
                // utilizamos el ngZone debido al callback generado por google
                // es una función que esta fuera del entorno de Angular.
                // console.log('respGoogle: ',respGoogle)
                this.ngZone.run(() => this.router.navigate([this.returnUrl]))
            }, err => {
                console.log('err: ',err);
            }
        )
    }

    // Inicialización y diseño del botón de google
    private initGoogleSignIn(){
        if(!this.googleInitialized) this.googleInitialized = true;
        try {
            // callback de google
            google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID, // ocultar en Angular
            callback: (dataGoogle:any) => {this.loginGoogle(dataGoogle);}
        });
        } catch (error) {
            console.error('Error al inicializar elGoogle ID:', error);
        }

        if(this.googleBtn?.nativeElement) {
            try {
                // configuración del boton de google
                google.accounts.id.renderButton(document.getElementById("google-btn"), 
                {
                    theme: 'filled_white',
                    size: 'medium',
                    shape: 'square',
                    text: 'continue_with',
                    width: 387
                });
            } catch (error) {
                console.error('Error al renderizar el botón de google:', error);
            }
        }

    }

    // Redirección al Entity Provider => Login de Single Sign-On SAML & Orcle
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

            window.location.assign(loginUrl); // redirige al login del Entity Provider

        } catch (e:any) {
            Swal.fire('SSO', e?.error?.message || 'No se pudo obtener la URL del Single Sign-On', 'error');
        }
    }

    // (Verificación) => Redirección al Entity Provider => Login de Single Sign-On SAML & Orcle
    verifyloginSamlMixOrcl() {
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
    }

    // Redirección al Entity Provider => Login de Single Sign-On SAML
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

            window.location.assign(loginUrl); // redirige al login del Entity Provider

        } catch (e:any) {
            Swal.fire('SSO', e?.error?.message || 'No se pudo obtener la URL del Single Sign-On', 'error');
        }
    }

    // (Verificación) => Redirección al Entity Provider => Login de Single Sign-On SAML
    verifyloginSaml() {
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