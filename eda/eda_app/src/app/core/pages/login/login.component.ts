import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NgForm } from '@angular/forms';
import { User } from '@eda/models/model.index';
import { UserService } from '@eda/services/service.index';
import { LogoImage, SubLogoImage, BackgroundImage } from '@eda/configs/index';
import Swal from 'sweetalert2';
import * as _ from 'lodash';

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

    constructor(
        private userService: UserService,
        private router: Router,
        private route: ActivatedRoute
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

        this.email = sessionStorage.getItem('email') || '';

        if (this.email.length > 1) {
            this.remember = true;
        }

    }

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
            baseUrl.slice(-4) ==  '/en/'  ||
            baseUrl.slice(-4) ==  '/gl/'
             ){
                baseUrl  = baseUrl.slice(0, baseUrl.length -3)
            }
        switch(lan){
            case 'EN'  : window.location.href = baseUrl + 'en/#/'; break;
            case 'CAT' : window.location.href = baseUrl + 'ca/#/'; break;
            case 'ES'  : window.location.href = baseUrl + 'es/#/'; break;
            case 'PL'  : window.location.href = baseUrl + 'pl/#/'; break;
            case 'GL'  : window.location.href = baseUrl + 'gl/#/'; break;
        }
    }
}
