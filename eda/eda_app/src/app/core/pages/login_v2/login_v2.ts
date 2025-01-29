// login.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LogoImage, SubLogoImage, BackgroundImage } from '@eda/configs/index';
import { ParticlesBackgroundComponent } from '@eda/shared/components/particles-background/particles-background';

@Component({
    selector: 'app-loginv2',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ParticlesBackgroundComponent],
    templateUrl: './login_v2.html',
    styleUrls: ["./login_v2.scss"],
})
export class LoginV2Component {
    loginForm: FormGroup;
    logo: string;
    subLogo: string;
    currentYear: string;
    backgroundImage: string

    constructor(private fb: FormBuilder) {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', Validators.required],
            remember: [false]
        });

        this.logo = LogoImage;
        this.subLogo = SubLogoImage;
        this.backgroundImage = BackgroundImage;
        const d = new Date();
        this.currentYear = d.getFullYear().toString();
    }

    onSubmit() {
        if (this.loginForm.valid) {
            console.log(this.loginForm.value);
            // Add your login logic here
        }
    }
}