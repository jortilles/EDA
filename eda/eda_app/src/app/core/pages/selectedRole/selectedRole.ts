import { Component, inject, OnInit, NgZone, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LogoImage, SubLogoImage, BackgroundImage } from '@eda/configs/index';
import { ParticlesBackgroundComponent } from '@eda/shared/components/particles-background/particles-background';
import { UserService } from '@eda/services/service.index';
import { User } from '@eda/models/model.index';
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

    readonly logo = LogoImage
    readonly subLogo = SubLogoImage
    readonly backgroundImage = BackgroundImage
    readonly currentYear = new Date().getFullYear().toString()

    selectedRole: string = '';
    roles: any[] = [];

    constructor() {

    }

    ngOnInit(): void {
        console.log('hola .... inicio')

        const hash = window.location.hash; 
        const hashParts = hash.split('?');

        console.log('hash: ', hash);
        console.log('hashParts: ', hashParts);

        if (hashParts.length > 1) {
            const paramsString = hashParts[1];
            const params = new URLSearchParams(paramsString);
            const rolesParam = params.get('roles');

            console.log('rolesParam:', rolesParam);

            if (rolesParam) {
                try {
                    this.roles = JSON.parse(decodeURIComponent(rolesParam));
                } catch (err) {
                    console.error('Error parseando roles de la URL', err);
                }
            }
        }

        console.log('roles: ', this.roles);

    }

    selectedRoleEnter(role: string) {

        console.log('Este es el role seleccionado: ', role);
        // Generar el endpoint final para el login con el role de parametro.

    }

}