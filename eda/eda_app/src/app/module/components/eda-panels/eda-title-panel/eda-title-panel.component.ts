import { DashboardService } from './../../../../services/api/dashboard.service';
import { Component, OnInit, Input, Output, EventEmitter, ViewEncapsulation } from "@angular/core";
import { InjectEdaPanel, EdaTitlePanel } from '@eda/models/model.index';
import { EdaContextMenu, EdaContextMenuItem, EdaDialogCloseEvent, EdaDialogController } from '@eda/shared/components/shared-components.index';
import { DomSanitizer } from '@angular/platform-browser'
import {SafeHtmlPipe} from './htmlSanitizer.pipe'
import {SafeUrlPipe} from './urlSanitizer.pipe'
import * as _ from 'lodash';
import { environment } from 'environments/environment';
import { EdaContextMenuComponent } from '@eda/shared/components/shared-components.index';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TitleDialogComponent } from './edit-title/quill-editor.component';
import { FileUtiles } from '@eda/services/service.index';
import { SHOW_LOCK_IN_PANEL_HEADER } from '@eda/configs/customizable/customizable_default';
@Component({
    standalone: true,
    selector: 'eda-title-panel',
    templateUrl: './eda-title-panel.component.html',
    styleUrls: ['./eda-title-panel.component.css'],
    encapsulation: ViewEncapsulation.None,
    imports: [FormsModule, CommonModule, SafeHtmlPipe, EdaContextMenuComponent, TitleDialogComponent]
})

export class EdaTitlePanelComponent implements OnInit {
    @Input() id: string;
    @Input() panel: EdaTitlePanel;
    @Input() inject: InjectEdaPanel;
    @Output() remove: EventEmitter<any> = new EventEmitter();
    @Output() duplicate: EventEmitter<any> = new EventEmitter();

    titleClick: boolean = false;
    readonly showLockInHeader = SHOW_LOCK_IN_PANEL_HEADER;
    contextMenu: EdaContextMenu;
    editTittleController: EdaDialogController;
    display: any = {
        editMode: true
    }
    public htmlPipe : SafeHtmlPipe
    public urlPipe : SafeUrlPipe


    constructor(public sanitized: DomSanitizer, public dashboardService : DashboardService, private fileUtiles: FileUtiles){}


    ngOnInit(): void {
        this.initContextMenu()
        this.setEditMode();
    }

    // Style for the title content wrapper: applies the selected vertical alignment
    getTitleStyle(): any {
        const align = this.panel.verticalAlign || 'center';
        let alignItems = 'center';
        if (align === 'top') alignItems = 'flex-start';
        else if (align === 'bottom') alignItems = 'flex-end';

        return {
            'display': 'flex',
            'align-items': alignItems
        };
    }

    // Style for the panel wrapper: border/background according to panel config
    getPanelStyle(): any {
        const showBorder = this.panel.showBorder !== false; // default true
        const borderColor = this.panel.borderColor || '#d7dde6';
        const backgroundTransparent = this.panel.backgroundTransparent;

        if (!showBorder && backgroundTransparent) {
            return {
                'border': 'none',
                'border-radius': '0',
                'box-shadow': 'none',
                'background': 'transparent',
                'padding': '0'
            };
        }

        return {
            'border': showBorder ? `1px solid ${borderColor}` : 'none',
            'border-radius': showBorder ? '0.5rem' : '0',
            'box-shadow': 'none',
            'background': backgroundTransparent ? 'transparent' : (this.panel.backgroundColor || undefined)
        };
    }

    public setTitle(): void {
        this.titleClick = !this.titleClick;

        this.dashboardService.setNotSaved(true);
        if (this.titleClick) {

        }
    }

    public setEditMode(): void {
        const user = localStorage.getItem('user');
        const userName = JSON.parse(user).name;
        this.display.editMode = (userName !== 'edaanonim' && !this.inject.isObserver);
    }

    public initContextMenu(): void {
        this.contextMenu = new EdaContextMenu({
            header: $localize`:@@panelOptions0:OPCIONES DEL PANEL`,
            contextMenuItems: [
                new EdaContextMenuItem({
                    label: $localize`:@@panelOptions2:Editar opciones del gráfico`,
                    icon: 'mdi mdi-wrench',
                    command: () => {
                        this.contextMenu.hideContextMenu();
                        this.openEditDialog();
                    }
                }),
                new EdaContextMenuItem({
                    label: $localize`:@@duplicatePanel:Duplicar panel`,
                    icon: 'fa fa-copy',
                    command: () => {
                        this.contextMenu.hideContextMenu();
                        this.duplicatePanel();
                    }
                }),
                ...(this.showLockInHeader ? [] : [this._buildToggleLockItem()]) as EdaContextMenuItem[],
                new EdaContextMenuItem({
                    label: $localize`:@@panelOptions4:Eliminar panel`,
                    icon: 'fa fa-trash',
                    command: () => {
                        this.contextMenu.hideContextMenu();
                        this.removePanel();
                    }
                })
            ]
        });
    }

    public openEditDialog(): void {
        this.editTittleController = new EdaDialogController({
            params: {
                title: this.panel.title,
                backgroundTransparent: this.panel.backgroundTransparent,
                verticalAlign: this.panel.verticalAlign,
                borderColor: this.panel.borderColor,
                showBorder: this.panel.showBorder,
                backgroundColor: this.panel.backgroundColor
            },
            close: (event, response) => {
                if(!_.isEqual(event, EdaDialogCloseEvent.NONE)){
                    this.panel.title = response.title;
                    this.panel.backgroundTransparent = response.backgroundTransparent;
                    this.panel.verticalAlign = response.verticalAlign || 'center';
                    this.panel.borderColor = response.borderColor || '#d7dde6';
                    this.panel.showBorder = response.showBorder !== false;
                    this.panel.backgroundColor = response.backgroundColor || '#ffffff';
                    this.setPanelSize()
                    this.dashboardService.setNotSaved(true);
                }
                this.editTittleController = null;
            }
          });
    }

    public duplicatePanel(): void {
        const sourcePanelId = this.panel.id;
        const duplicatedPanel = _.cloneDeep(this.panel, true);
        duplicatedPanel.id = this.fileUtiles.generateUUID();
        duplicatedPanel.y = duplicatedPanel.y + 1;
        this.duplicate.emit({ panel: duplicatedPanel, sourcePanelId });
    }

    public isPanelLocked(): boolean {
        return (this.panel as any).dragEnabled === false;
    }

    public togglePanelLock(): void {
        const locked = this.isPanelLocked();
        (this.panel as any).dragEnabled = locked;
        (this.panel as any).resizeEnabled = locked;
        this.inject.gridsterOptions?.api?.optionsChanged();
        this.dashboardService.setNotSaved(true);
    }

    private _buildToggleLockItem(): EdaContextMenuItem {
        const isLocked = () => (this.panel as any).dragEnabled === false;
        const item = new EdaContextMenuItem({
            label: isLocked() ? $localize`:@@panelOptionsUnlock:Desbloquear panel` : $localize`:@@panelOptionsLock:Bloquear panel`,
            icon: isLocked() ? 'pi pi-lock' : 'pi pi-lock-open',
            command: () => {
                if (isLocked()) {
                    (this.panel as any).dragEnabled = true;
                    (this.panel as any).resizeEnabled = true;
                    item.label = $localize`:@@panelOptionsLock:Bloquear panel`;
                    item.icon = 'pi pi-lock-open';
                } else {
                    (this.panel as any).dragEnabled = false;
                    (this.panel as any).resizeEnabled = false;
                    item.label = $localize`:@@panelOptionsUnlock:Desbloquear panel`;
                    item.icon = 'pi pi-lock';
                }
                this.inject.gridsterOptions?.api?.optionsChanged();
                this.dashboardService.setNotSaved(true);
            }
        });
        return item;
    }
    
    public openContextMenu(event: MouseEvent): void {
        const lockIdx = this.contextMenu.contextMenuItems.findIndex(i =>
            i.label === $localize`:@@panelOptionsLock:Bloquear panel` ||
            i.label === $localize`:@@panelOptionsUnlock:Desbloquear panel`
        );
        if (lockIdx !== -1) {
            this.contextMenu.contextMenuItems[lockIdx] = this._buildToggleLockItem();
        }
        this.contextMenu.showContextMenu(event);
    }

    public removePanel(): void {
        this.remove.emit(this.panel.id);
    }

    public setPanelSize(): void {
        let element: any;
        if (environment.production) {
            element = document.querySelector(`[id^="${this.panel.id.substring(0,30)}"]`);
        } else {
            element = document.querySelector(`[ng-reflect-id^="${this.panel.id.substring(0,30)}"]`);
        }

        let parentElement: any = element?.parentNode;
        
        if (parentElement) {
            let parentWidth = parentElement.offsetWidth - 20;
            let parentHeight = parentElement.offsetHeight - 20;
            
            
            if (this.panel.title.includes('img')) {
                this.panel.title = this.panel.title.replace('<img', `<img style="max-height: ${parentHeight}px; max-width: ${parentWidth}px;"`);
            }
        }
    }
}