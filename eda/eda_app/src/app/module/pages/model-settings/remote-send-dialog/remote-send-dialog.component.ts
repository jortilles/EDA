import { Component, computed, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EdaDialog2Component } from '@eda/shared/components/eda-dialogs/eda-dialog2/eda-dialog2.component';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { AlertService } from '@eda/services/service.index';
import {
  REMOTE_SESSION_EXPIRED_STATUS,
  RemoteSendResult,
  RemoteTransferService,
  RemoteTransferType
} from '@eda/services/api/remote-transfer.service';
import { describeTransferReport } from '../transfer-report';

/**
 * Dialog that logs in on another Edalitics instance and sends a data model or a dashboard to it.
 * The local JWT is not valid in the destination (each instance signs its own tokens),
 * so the user has to log in on the remote server.
 */
@Component({
  selector: 'app-remote-send-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, EdaDialog2Component, IconComponent],
  templateUrl: './remote-send-dialog.component.html'
})
export class RemoteSendDialogComponent implements OnInit {
  private remoteTransferService = inject(RemoteTransferService);
  private alertService = inject(AlertService);

  @Input() type: RemoteTransferType;
  @Input() objectId: string;
  @Input() objectName: string;
  @Output() close = new EventEmitter<void>();

  public session = this.remoteTransferService.session;

  // Login form
  public url = '';
  public email = '';
  public password = '';

  public loading = signal<boolean>(false);
  public errorMessage = signal<string>('');
  public result = signal<RemoteSendResult | null>(null);
  /** Users / groups matched or not found in the destination */
  public reportLines = computed(() => {
    const res = this.result();
    return res ? describeTransferReport(this.type, res.permissions, res.ownerMatched, res.maps) : { info: [], warnings: [] };
  });

  public header = $localize`:@@sendToRemoteTitle:Enviar a otro servidor Edalitics`;

  ngOnInit(): void {
    this.url = this.session()?.url || this.remoteTransferService.getLastUrl();
  }

  get canLogin(): boolean {
    return !!this.url?.trim() && !!this.email?.trim() && !!this.password && !this.loading();
  }

  login(): void {
    if (!this.canLogin) return;
    this.loading.set(true);
    this.errorMessage.set('');

    this.remoteTransferService.login(this.url.trim(), this.email.trim(), this.password).subscribe({
      next: () => {
        // The remote password is not kept once the remote session is open
        this.password = '';
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.text || $localize`:@@remoteLoginError:No se ha podido iniciar sesión en el servidor remoto`);
      }
    });
  }

  changeServer(): void {
    this.remoteTransferService.logout();
    this.result.set(null);
    this.errorMessage.set('');
  }

  send(): void {
    if (!this.session() || this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set('');
    this.result.set(null);

    this.remoteTransferService.send(this.type, this.objectId).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.result.set(res);
        this.alertService.addSuccess(this.type === 'datasource'
          ? $localize`:@@remoteModelSent:Modelo enviado correctamente`
          : $localize`:@@remoteDashboardSent:Dashboard enviado correctamente`);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === REMOTE_SESSION_EXPIRED_STATUS) {
          this.remoteTransferService.logout();
          this.errorMessage.set($localize`:@@remoteSessionExpired:La sesión en el servidor remoto ha caducado. Vuelve a iniciar sesión.`);
          return;
        }
        this.errorMessage.set(err?.text || $localize`:@@remoteSendError:Ha ocurrido un error al enviar al servidor remoto`);
      }
    });
  }

  onClose(): void {
    this.close.emit();
  }
}
