// Variable google
declare var google: any;

import { Component, NgZone, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NgForm } from '@angular/forms';
import { User } from '@eda/models/model.index';
import { UserService } from '@eda/services/service.index';
import { LogoImage, SubLogoImage, BackgroundImage } from '@eda/configs/index';
import Swal from 'sweetalert2';
import * as _ from 'lodash';
import { MsalService } from '@azure/msal-angular';
import { GOOGLE_CLIENT_ID } from '@eda/configs/config';



declare function init_plugins();

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
    public email: string;
    public remember: boolean;
    public returnUrl: string;
    public urlParams: any;
    public logo: string;
    public subLogo: string;
    public backgroundImage: string
    public languages: Array<any>;
    public selectedLanguage: string;
    // loginDisplay = false;

    constructor(
        private userService: UserService,
        private router: Router,
        private route: ActivatedRoute,
        private ngZone: NgZone, // se utiliza para envolver la navegación router
        private authService: MsalService
    ) {
        this.logo = LogoImage;
        this.subLogo = SubLogoImage;
        this.backgroundImage = BackgroundImage;
        this.selectedLanguage = 'CAT';

        this.languages =
            [
                { name: 'Català', code: 'CAT' },
                { name: 'Español', code: 'ES' },
                { name: 'English', code: 'EN' },
                { name: 'Polski', code: 'PL' }


            ]
    }

    ngOnInit(): void {
        init_plugins();

        this.route.queryParamMap.subscribe(params => this.urlParams = JSON.parse(JSON.stringify(params)).params.params);

        // this.urlParams = this.route.snapshot.queryParams['params'];
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';

        this.email = localStorage.getItem('email') || '';

        if (this.email.length > 1) {
            this.remember = true;
        }

        // callback de google
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID, // ocultar en Angular
            callback: (dataGoogle:any) => {
                this.handleResponseGoogle(dataGoogle);
            }
        })

        // configuración del boton de google
        google.accounts.id.renderButton(document.getElementById("google-btn"), {
            theme: 'filled_white',
            size: 'medium',
            shape: 'square',
            text: 'continue_with',
            width: 180
        })

    }

    handleResponseGoogle(respGoogle:any) {
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

    loginMicrosoft() {
        this.authService.loginPopup({
            scopes: ['User.Read'] // configuración en la aplicación de - Jortilles Web EDA
        }).subscribe({
          next: (respMicrosoft) => {
            // console.log('respMicrosoft: ',respMicrosoft);
            // this.setLoginDisplay();
            this.userService.responseMicrosoft(respMicrosoft).subscribe((res) => {
                // console.log(res);
                this.ngZone.run(() => this.router.navigate([this.returnUrl]))
            }, err => {
                console.log('err: ',err)
            })
          },
          error: (error) => console.log('error: ',error)
        });
    }
    // setLoginDisplay() {
    //     this.loginDisplay = this.authService.instance.getAllAccounts().length > 0;
    //   }

    public login(form: NgForm) {
        if (form.invalid) {
            return;
        } else {
            const user = new User(null, form.value.email, form.value.password);

            this.userService.login(user, form.value.remember).subscribe(
                () => {

                    if (this.urlParams) {

                        const params = this.urlParams.split('&')

                        let newParams: any = {};

                        for (const param of Object.keys(params)) {
                            if (params[param].split('=')[1].split('%7C')[1]) {
                                let paramSplit = params[param].split('=')[1].split('%7C');
                                newParams[params[param].split('=')[0]] = paramSplit.join('|');
                            } else {
                                newParams[params[param].split('=')[0]] = params[param].split('=')[1];
                            }
                        }

                        this.router.navigate([this.returnUrl], { queryParams: newParams });
                    } else {
                        this.router.navigate([this.returnUrl]);
                    }

                },
                err => Swal.fire('Error al iniciar sesión', err.text, 'error')
            );
        }
    }

    public redirectLocale(lan:string){
        let baseUrl = window.location.href.split('#')[0];
        if( baseUrl.slice(-4) ==  '/es/'  || 
            baseUrl.slice(-4) ==  '/ca/'  ||  
            baseUrl.slice(-4) ==  '/pl/'  ||  
            baseUrl.slice(-4) ==  '/en/'   ){
                baseUrl  = baseUrl.slice(0, baseUrl.length -3)
            }
        switch(lan){
            case 'EN'  : window.location.href = baseUrl + 'en/#/'; break;
            case 'CAT' : window.location.href = baseUrl + 'ca/#/'; break;
            case 'ES'  : window.location.href = baseUrl + 'es/#/'; break;
            case 'PL'  : window.location.href = baseUrl + 'pl/#/'; break;
        }
    }
}
