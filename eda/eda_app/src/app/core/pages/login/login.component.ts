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
                { name: 'English', code: 'EN' }
            ]
    }

    ngOnInit(): void {
        init_plugins();

        this.route.queryParamMap.subscribe(params => this.urlParams = JSON.parse(JSON.stringify(params)).params.params);

        // this.urlParams = this.route.snapshot.queryParams['params'];
        console.log(navigator.language)
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
        console.log(this.returnUrl, this.urlParams);

        this.email = localStorage.getItem('email') || '';

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
        switch(lan){
            case 'EN' : window.location.href = '/en/#/home'; break;
            case 'CAT' : window.location.href = '/ca/#/home'; break;
            case 'ES' : window.location.href = '/es/#/home'; break;
        }
    }
}
