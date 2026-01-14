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

    constructor() {

    }

    ngOnInit(): void {
        console.log('hola .... inicio')

    }

    selectedRoleEnter(role: string) {

        console.log('Este es el role seleccionado: ', role);
        
    }

}