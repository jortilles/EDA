import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, inject, LOCALE_ID } from '@angular/core';
import { FormGroup, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { lastValueFrom, Subscription } from 'rxjs';
import { DataSourceService, SpinnerService, AlertService } from '@eda/services/service.index';
import { PluginFormService } from '../plugin-form.service';

@Component({
    standalone: true,
    selector: 'eda-shopify-form',
    templateUrl: './shopify-form.component.html',
    imports: [CommonModule, FormsModule],
})
export class ShopifyFormComponent implements OnInit, OnDestroy {
    @Input() connectionForm!: FormGroup;

    private dataSourceService = inject(DataSourceService);
    private spinnerService    = inject(SpinnerService);
    private alertService      = inject(AlertService);
    private router            = inject(Router);
    private cdr               = inject(ChangeDetectorRef);
    private pluginFormService = inject(PluginFormService);
    private localeId          = inject(LOCALE_ID);

    public shopUrl      = '';
    public folderName   = '';
    public clientId     = '';
    public clientSecret = '';
    public showSecret   = false;
    public accessToken  = '';
    public shopAuthState: 'idle' | 'waiting' | 'authorized' | 'error' = 'idle';
    private pollInterval: any = null;
    private currentState = '';
    private saveSub!: Subscription;

    ngOnInit(): void {
        this.saveSub = this.pluginFormService.onSave$.subscribe(() => this.save());
    }

    ngOnDestroy(): void {
        this.saveSub?.unsubscribe();
        if (this.pollInterval) clearInterval(this.pollInterval);
    }

    async authorizeShopify(): Promise<void> {
        if (!this.shopUrl) {
            this.alertService.addError($localize`:@@shopifyShopRequired:Debe indicar la URL de la tienda Shopify`);
            return;
        }
        if (!this.clientId || !this.clientSecret) {
            this.alertService.addError($localize`:@@shopifyCredentialsRequired:Debe proporcionar el ID de cliente y el Secreto de la app Shopify`);
            return;
        }

        try {
            const res: any = await lastValueFrom(
                this.dataSourceService.getShopifyAuthUrl(this.shopUrl, this.clientId, this.clientSecret)
            );
            const { authUrl, state } = res;
            this.currentState = state;

            const popup = window.open(authUrl, 'shopify-auth', 'width=600,height=700,resizable=yes');

            this.shopAuthState = 'waiting';
            this.pollInterval = setInterval(async () => {
                try {
                    const poll: any = await lastValueFrom(this.dataSourceService.pollShopifyToken(this.currentState));
                    if (poll?.ready && poll.accessToken) {
                        clearInterval(this.pollInterval);
                        this.pollInterval = null;
                        this.accessToken = poll.accessToken;
                        this.shopAuthState = 'authorized';
                        if (popup && !popup.closed) popup.close();
                        this.cdr.detectChanges();
                    } else if (popup?.closed) {
                        clearInterval(this.pollInterval);
                        this.pollInterval = null;
                        if (this.shopAuthState === 'waiting') {
                            this.shopAuthState = 'idle';
                            this.cdr.detectChanges();
                        }
                    }
                } catch {
                    clearInterval(this.pollInterval);
                    this.pollInterval = null;
                    this.shopAuthState = 'error';
                    this.cdr.detectChanges();
                }
            }, 1500);
        } catch (err) {
            this.shopAuthState = 'error';
            this.alertService.addError(err);
        }
    }

    async save(): Promise<void> {
        const value = this.connectionForm.value;

        if (!value.name) {
            this.alertService.addError($localize`:@@noNameProvided:Debe proporcionar un nombre para el datasource`);
            return;
        }
        if (!this.shopUrl || !this.folderName) {
            this.alertService.addError($localize`:@@IncorrectForm:Formulario incorrecto. Revise los campos obligatorios.`);
            return;
        }
        if (!this.accessToken) {
            this.alertService.addError($localize`:@@shopifyAuthRequired:Debes autorizar el acceso a Shopify primero`);
            return;
        }

        this.spinnerService.on();
        try {
            const payload = {
                name:         value.name,
                description:  value.description || '',
                shop:         this.shopUrl,
                accessToken:  this.accessToken,
                folderName:   this.folderName,
                optimize:     value.optimize   ? 1 : 0,
                allowCache:   value.allowCache ? 1 : 0,
                locale:       this.localeId,
            };

            const res: any = await lastValueFrom(this.dataSourceService.addShopifyDataSource(payload));
            this.spinnerService.off();
            this.alertService.addSuccess($localize`:@@shopifyCreated:Fuente de datos Shopify creada correctamente`);
            this.router.navigate(['/data-source/', res.data_source_id]);
        } catch (err) {
            this.spinnerService.off();
            this.alertService.addError(err);
        }
    }
}
