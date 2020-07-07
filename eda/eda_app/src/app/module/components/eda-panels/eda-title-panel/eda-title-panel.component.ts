import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";
import { InjectEdaPanel, EdaTitlePanel } from '@eda/models/model.index';
import { EdaContextMenu, EdaContextMenuItem } from '@eda/shared/components/shared-components.index';

@Component({
    selector: 'eda-title-panel',
    templateUrl: './eda-title-panel.component.html'
})

export class EdaTitlePanelComponent implements OnInit {
    @Input() panel: EdaTitlePanel;
    @Input() inject: InjectEdaPanel;
    @Output() remove: EventEmitter<any> = new EventEmitter();
    
    titleClick: boolean = false;
    contextMenu: EdaContextMenu;
    display: any = {
        editMode: true
    }
    

    ngOnInit(): void {
        this.initContextMenu()
        this.setEditMode();
    }

    setTitle(): void {
        this.titleClick = !this.titleClick;

        if (this.titleClick) {

        }
    }

    setEditMode(): void {
        const user = localStorage.getItem('user');
        const userName = JSON.parse(user).name;
        this.display.editMode = userName !== 'edaanonim';
    }

    initContextMenu(): void {
        this.contextMenu = new EdaContextMenu({
            header: 'OPCIONES DEL PANEL',
            contextMenuItems: [
                new EdaContextMenuItem({
                    label: 'Eliminar panel',
                    icon: 'fa fa-trash',
                    command: () => {
                        this.contextMenu.hideContextMenu();
                        this.removePanel();
                    }
                })
            ]
        });

    }
    
    removePanel(): void {
        this.remove.emit(this.panel.id);
    }
}