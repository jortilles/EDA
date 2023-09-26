import { DashboardService } from './../../../../services/api/dashboard.service';
import { Component, OnInit, Input, Output, EventEmitter, ViewEncapsulation } from "@angular/core";
import { InjectEdaPanel, EdaTitlePanel } from '@eda/models/model.index';
import { EdaContextMenu, EdaContextMenuItem, EdaDialogCloseEvent, EdaDialogController } from '@eda/shared/components/shared-components.index';
import { DomSanitizer } from '@angular/platform-browser'
import {SafeHtmlPipe} from './htmlSanitizer.pipe'
import {SafeUrlPipe} from './urlSanitizer.pipe'
import * as _ from 'lodash';
import { environment } from 'environments/environment';

@Component({
    selector: 'eda-title-panel',
    templateUrl: './eda-title-panel.component.html',
    styleUrls: ['./eda-title-panel.component.css'],
    encapsulation: ViewEncapsulation.None
})

export class EdaTitlePanelComponent implements OnInit {
    @Input() id: string;
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

    public setTitle(): void {
        this.titleClick = !this.titleClick;

        this.dashboardService._notSaved.next(true);
        if (this.titleClick) {

        }
    }

    public setEditMode(): void {
        const user = sessionStorage.getItem('user');
        const userName = JSON.parse(user).name;
        this.display.editMode = (userName !== 'edaanonim' && !this.inject.isObserver);
    }

    public initContextMenu(): void {
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
                                    this.setPanelSize()
                                    this.dashboardService._notSaved.next(true);
                                }
                                this.editTittleController = null;
                                // this.setPanelSize()
                            }
                          });
                    }
                })
            ]
        });

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