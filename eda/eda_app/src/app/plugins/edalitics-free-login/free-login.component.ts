import { Component, OnInit, AfterViewChecked, LOCALE_ID, inject } from '@angular/core';
import { FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MsalModule } from '@azure/msal-angular';
import { LoginV2Component } from 'app/core/pages/login/login';
import { SignupService } from './signup.service';
import Swal from 'sweetalert2';

/**
 * Edalitics Free login page (design system proposal A · Split): value panel + form with
 * "Sign in / Create account" tabs. Reuses every sign-in method of the core LoginV2Component
 * and adds self-service sign up through the API "signup" plugin.
 */
@Component({
    selector: 'app-free-login',
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule, MsalModule],
    templateUrl: './free-login.component.html',
    styleUrls: ['./free-login.component.scss'],
})
export class FreeLoginComponent extends LoginV2Component implements OnInit, AfterViewChecked {

    // Bar heights (%) of the illustrative dashboard
    readonly sampleBars = [45, 62, 55, 78, 70, 92, 84];

    // App locales, labelled in their own language (same list as the main sidebar)
    readonly languages = [
        { code: 'es', label: 'Español' },
        { code: 'en', label: 'English' },
        { code: 'ca', label: 'Català' },
        { code: 'fr', label: 'Français' },
        { code: 'pl', label: 'Polski' },
        { code: 'de', label: 'Deutsch' },
        { code: 'pt', label: 'Português' },
    ];
    readonly currentLanguage: string = (inject(LOCALE_ID) || 'es').toLowerCase().split('-')[0];

    signupForm: FormGroup;
    mode: 'login' | 'signup' = 'login';
    signupEnabled = false;
    signupSending = false;
    signupDoneEmail: string = null;
    showPassword = false;

    private signupService = inject(SignupService);
    private googleButtonHost: HTMLElement = null; // Element the button was rendered into (re-render if recreated)

    constructor() {
        super();
        this.signupForm = this.fb.group({
            name: ['', [Validators.required, Validators.maxLength(100)]],
            email: ['', [Validators.required, Validators.email]],
            acceptTerms: [false, Validators.requiredTrue]
        });
    }

    /** True when Google or Microsoft sign-in is offered: both create the account on first use */
    get instantAccountSso(): boolean {
        return this.singleSignOnGoogleAvailable || this.singleSignOnMicrosoftAvailable;
    }

    get hasSso(): boolean {
        return this.instantAccountSso || this.singleSignOnSamlAvailable || this.singleSignOnSamlMixOrclAvailable;
    }

    override ngOnInit(): void {
        super.ngOnInit();

        // /signup opens the "Create account" tab
        const wantsSignup = this.route.snapshot.data?.['mode'] === 'signup';
        this.signupService.isEnabled().subscribe({
            next: (enabled) => {
                this.signupEnabled = enabled;
                if (enabled && wantsSignup) this.mode = 'signup';
            },
            error: () => this.signupEnabled = false
        });
    }

    override ngAfterViewChecked(): void {
        // The SSO block is recreated when leaving the sign up confirmation: render the core Google button again
        const host = this.googleBtn?.nativeElement;
        if (this.singleSignOnGoogleAvailable && host && host !== this.googleButtonHost) {
            this.googleButtonHost = host;
            this.initGoogleSignIn();
        }
    }

    setMode(mode: 'login' | 'signup') {
        this.mode = mode;
        this.signupDoneEmail = null;
    }

    // Self-service sign up: the password is sent by email
    onSubmitSignup() {
        if (this.signupForm.invalid || this.signupSending) return;

        const { name, email, acceptTerms } = this.signupForm.value;
        this.signupSending = true;
        this.signupService.signup(name.trim(), email.trim(), acceptTerms).subscribe({
            next: (res: any) => {
                this.signupSending = false;
                this.signupDoneEmail = res?.email || email.trim();
                this.signupForm.reset({ name: '', email: '', acceptTerms: false });
            },
            error: (err: any) => {
                this.signupSending = false;
                Swal.fire($localize`:@@signupErrorTitle:No se pudo crear la cuenta`, this.signupErrorText(err?.status), 'error');
            }
        });
    }

    /**
     * Reloads the page in the chosen locale. Each locale build is served from its own
     * base path (/es/, /en/...), so the locale segment is replaced keeping the current route.
     */
    changeLanguage(code: string) {
        if (!code || code === this.currentLanguage) return;

        let baseUrl = window.location.href.split('#')[0];
        const localeSegment = new RegExp(`/(${this.languages.map(l => l.code).join('|')})/$`);
        baseUrl = baseUrl.replace(localeSegment, '/');
        if (!baseUrl.endsWith('/')) baseUrl += '/';

        window.location.href = `${baseUrl}${code}/${window.location.hash || '#/login'}`;
    }

    goToLoginAfterSignup() {
        this.loginForm.patchValue({ email: this.signupDoneEmail, password: '' });
        this.setMode('login');
    }

    private signupErrorText(status: number): string {
        switch (status) {
            case 409: return $localize`:@@signupErrorExists:Ya existe una cuenta con este email. Inicia sesión o entra con Google o Microsoft.`;
            case 429: return $localize`:@@signupErrorRateLimit:Demasiados intentos. Inténtalo de nuevo más tarde.`;
            case 503: return $localize`:@@signupErrorMail:Ahora mismo no podemos enviar el email con tu contraseña. Inténtalo de nuevo más tarde.`;
            default: return $localize`:@@signupErrorGeneric:Revisa el nombre y el email e inténtalo de nuevo.`;
        }
    }
}
