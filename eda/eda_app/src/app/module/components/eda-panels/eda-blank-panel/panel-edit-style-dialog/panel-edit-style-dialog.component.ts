import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColorPickerModule } from 'primeng/colorpicker';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { EdaDialog, EdaDialog2Component, EdaDialogCloseEvent, EdaDialogController } from '@eda/shared/components/shared-components.index';
import { PanelStyleOverride, StyleProviderService } from '@eda/services/service.index';

@Component({
  standalone: true,
  selector: 'app-panel-edit-style-dialog',
  templateUrl: './panel-edit-style-dialog.component.html',
  styleUrls: ['./panel-edit-style-dialog.component.css'],
  imports: [CommonModule, FormsModule, ColorPickerModule, DropdownModule, InputTextModule, EdaDialog2Component],
})
export class PanelEditStyleDialogComponent implements OnInit {
  @Input() controller: EdaDialogController;

  public dialog: EdaDialog;

  public fonts: Array<any> = [
    { label: 'Montserrat', value: 'Montserrat' },
    { label: 'Questrial', value: 'Questrial' },
    { label: 'League Spartan', value: 'League Spartan' },
    { label: 'Raleway', value: 'Raleway' },
    { label: 'Bangers', value: 'Bangers' },
    { label: 'Serif', value: 'Serif' },
    { label: 'Sans-serif', value: 'Sans-serif' },
    { label: 'Monospace', value: 'Monospace' },
    { label: 'Cursive', value: 'Cursive' },
    { label: 'Papyrus', value: 'Papyrus' },
    { label: 'Courier New', value: 'Courier New' },
  ].sort((a, b) => a.label.localeCompare(b.label));

  /** Panel color */
  public panelColor: string;

  /** Panel title */
  public selectedPanelTitleFont: string;
  public panelTitleFontSize: number;
  public panelTitleFontColor: string;
  public alignPanelTitle: string;

  /** Panel content */
  public selectedPanelFont: string;
  public panelFontSize: number;
  public panelFontColor: string;

  public samplePanelStyle: any = {};
  public samplePanelTitleStyle: any = {};
  public samplePanelContentStyle: any = {};

  public left: string = $localize`:@@left:Izquierda`;
  public center: string = $localize`:@@center:Centro`;
  public right: string = $localize`:@@right:Derecha`;
  public samplePanelName: string = $localize`:@@samplePanelName:Título del panel`;

  constructor(public styleProviderService: StyleProviderService) {}

  ngOnInit(): void {
    this.seedFrom(this.controller?.params?.override);
  }

  private seedFrom(override?: PanelStyleOverride): void {
    this.panelColor = this.styleProviderService.resolvePanelColor(override);

    this.selectedPanelTitleFont = this.styleProviderService.resolvePanelTitleFontFamily(override);
    this.panelTitleFontSize = this.styleProviderService.resolvePanelTitleFontSize(override);
    this.panelTitleFontColor = this.styleProviderService.resolvePanelTitleFontColor(override);
    this.alignPanelTitle = this.styleProviderService.resolvePanelTitleAlign(override);

    this.selectedPanelFont = this.styleProviderService.resolveContentFontFamily(override);
    this.panelFontSize = this.styleProviderService.resolveContentFontSize(override);
    this.panelFontColor = this.styleProviderService.resolveContentFontColor(override);

    this.updateSamples();
  }

  public updateSamples(): void {
    this.samplePanelStyle = {
      'background-color': this.panelColor,
      'box-shadow': '0 2px 1px -1px rgb(0 0 0 / 20%), 0 1px 1px 0 rgb(0 0 0 / 14%), 0 1px 3px 0 rgb(0 0 0 / 12%)',
    };
    this.samplePanelTitleStyle = {
      'font-family': this.selectedPanelTitleFont,
      color: this.panelTitleFontColor,
      'text-align': this.alignPanelTitle === 'flex-start' ? 'left' : this.alignPanelTitle === 'center' ? 'center' : 'right',
      'font-size': `${this.panelTitleFontSize / 10 + 1.2}rem`,
    };
    this.samplePanelContentStyle = {
      'font-family': this.selectedPanelFont,
      color: this.panelFontColor,
      'font-size': `${this.panelFontSize / 10 + 1}rem`,
    };
  }

  public onApply(): void {
    const override: PanelStyleOverride = {
      panelColor: this.panelColor,
      panelTitle: {
        fontFamily: this.selectedPanelTitleFont,
        fontSize: this.panelTitleFontSize,
        fontColor: this.panelTitleFontColor,
        align: this.alignPanelTitle,
      },
      panelContent: {
        fontFamily: this.selectedPanelFont,
        fontSize: this.panelFontSize,
        fontColor: this.panelFontColor,
      },
    };
    this.controller.close(EdaDialogCloseEvent.UPDATE, override);
  }

  public onClose(): void {
    this.controller.close(EdaDialogCloseEvent.NONE);
  }

  /** "Volver a los valores por defecto": clears the override so the panel goes back to
   * following the global dashboard style live, instead of freezing it at today's global values. */
  public onReset(): void {
    this.controller.close(EdaDialogCloseEvent.UPDATE, null);
  }
}
