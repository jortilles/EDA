import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LogoImage, SubLogoImage, BackgroundImage } from '@eda/configs/index';
import { ParticlesBackgroundComponent } from '@eda/shared/components/particles-background/particles-background';
import { UserService } from '@eda/services/service.index';
import { lastValueFrom } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-selected-role',
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule, ParticlesBackgroundComponent, FormsModule],
    templateUrl: './selectedRole.html',
    styleUrls: ["./selectedRole.scss"],
})
export class selectedRoleComponent implements OnInit {

    private userService = inject(UserService);
    private router = inject(Router);

    readonly logo = LogoImage
    readonly subLogo = SubLogoImage
    readonly backgroundImage = BackgroundImage
    readonly currentYear = new Date().getFullYear().toString()

    selectedRole: string = '';
    transactionId: string = '';
    roles: any[] = [];

    constructor() {

    }

    ngOnInit(): void {

        const hash = window.location.hash; 
        const hashParts = hash.split('?');

        console.log('hash: ', hash);
        console.log('hashParts: ', hashParts);

        if (hashParts.length > 1) {
            const paramsString = hashParts[1];
            const params = new URLSearchParams(paramsString);
            const rolesParam = params.get('roles');
            const transactionIdParam = params.get('transactionId');


            console.log('rolesParam:', rolesParam);

            if (rolesParam) {
                try {
                    this.roles = JSON.parse(decodeURIComponent(rolesParam));
                } catch (err) {
                    console.error('Error parseando roles de la URL', err);
                }
            }

            if (transactionIdParam) {
                this.transactionId = transactionIdParam;
            }

        }

        console.log('roles: ', this.roles);
        console.log('transactionId: ', this.transactionId);

    }

    async selectedRoleEnter(role: string) {

        const transactionId = this.transactionId;
        
        try {
            await lastValueFrom(this.userService.loginUrlOauthSelectedRole(role, transactionId));
            this.router.navigate(['/home']);
        } catch (error) {
            Swal.fire('Error al iniciar sesión, se perdio la conexión', error.error?.message || 'Ha ocurrido un error inesperado', 'error');
            console.error(error);
        }
    }

}