import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';

export type WarningDialogKind = 'heavyQuery' | 'cumsum';

/**
 * Single "¡Cuidado!" modal for the panel query flow, replacing the old alert-dialog +
 * cumsum-alert-dialog. `controller.params.kind` picks the message block and the button layout:
 *  - 'heavyQuery' -> Confirmar / Cancelar; close(true) means "run the query anyway".
 *  - 'cumsum'     -> single Entendido acknowledgement.
 */
@Component({
  standalone: true,
  selector: 'app-warning-dialog',
  templateUrl: './warning-dialog.component.html',
  styleUrls: ['./warning-dialog.component.css'],
  imports: [CommonModule, ButtonModule, EdaDialog2Component]
})
export class WarningDialogComponent {
  @Input() controller: any;

  get kind(): WarningDialogKind {
    return this.controller?.params?.kind ?? 'heavyQuery';
  }

  close(execute: boolean): void {
    this.controller.close(EdaDialogCloseEvent.NONE, execute);
  }
}
