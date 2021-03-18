import { DashboardService } from './../../../../services/api/dashboard.service';
import { Component, OnInit, Input, Output, EventEmitter, ViewEncapsulation } from "@angular/core";
import { InjectEdaPanel, EdaTitlePanel } from '@eda/models/model.index';
import { EdaContextMenu, EdaContextMenuItem, EdaDialogCloseEvent, EdaDialogController } from '@eda/shared/components/shared-components.index';
import { DomSanitizer } from '@angular/platform-browser'
import {SafeHtmlPipe} from './htmlSanitizer.pipe'
import {SafeUrlPipe} from './urlSanitizer.pipe'
import * as _ from 'lodash';

@Component({
    selector: 'eda-title-panel',
    templateUrl: './eda-title-panel.component.html',
    styleUrls: ['./eda-title-panel.component.css'],
    encapsulation: ViewEncapsulation.None
})

export class EdaTitlePanelComponent implements OnInit {
    @Input() panel: EdaTitlePanel;
    @Input() inject: InjectEdaPanel;
    @Output() remove: EventEmitter<any> = new EventEmitter();
    
    titleClick: boolean = false;
    contextMenu: EdaContextMenu;
    editTittleController: EdaDialogController;
    
    display: any = {
        editMode: true
    }
    public htmlPipe : SafeHtmlPipe
    public urlPipe : SafeUrlPipe
    constructor(public sanitized: DomSanitizer, public dashboardService : DashboardService){}
    

    ngOnInit(): void {
        this.initContextMenu()
        this.setEditMode();
    }

    setTitle(): void {
        this.titleClick = !this.titleClick;

        this.dashboardService._notSaved.next(true);
        if (this.titleClick) {

        }
    }

    setEditMode(): void {
        const user = localStorage.getItem('user');
        const userName = JSON.parse(user).name;
        this.display.editMode = (userName !== 'edaanonim' && !this.inject.isObserver);
    }

    initContextMenu(): void {
        this.contextMenu = new EdaContextMenu({
            header: $localize`:@@panelOptions0:OPCIONES DEL PANEL`,
            contextMenuItems: [
                new EdaContextMenuItem({
                    label: $localize`:@@panelOptions4:Eliminar panel`,
                    icon: 'fa fa-trash',
                    command: () => {
                        this.contextMenu.hideContextMenu();
                        this.removePanel();
                    }
                }),
                new EdaContextMenuItem({
                    label: $localize`:@@panelOptions2:Editar opciones del gráfico`,
                    icon: 'mdi mdi-wrench', 
                    command: () => {
                        
                        this.contextMenu.hideContextMenu();

                        this.editTittleController = new EdaDialogController({
                            params: { title: this.panel.title },
                            close: (event, response) => {
                                if(!_.isEqual(event, EdaDialogCloseEvent.NONE)){
                                    
                                    this.panel.title = response.title;
                                    this.dashboardService._notSaved.next(true);
                                }
                                this.editTittleController = null;
                            }
                          });
                    }
                })
            ]
        });

    }
    
    removePanel(): void {
        this.remove.emit(this.panel.id);
    }
}