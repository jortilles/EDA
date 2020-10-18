import { Dialog } from 'primeng/dialog';
import { EdaContextMenuItem } from '@eda/shared/components/eda-context-menu/eda-context-menu-item';
import * as _ from 'lodash';

export class EdaContextMenu {
    public dialog: Dialog;
    public header: string;
    public display: boolean = false;
    public style: any = { position: 'absolute' };
    public left: number;
    public top: number;
    public contextMenuItems: EdaContextMenuItem[];

    constructor(init: Partial<EdaContextMenu>) {
        Object.assign(this, init);
    }

    showContextMenu(event?: any) {
        this.display = true;

        if (event) {
            this.left = _.subtract(event.x, 326);
            this.top = event.y;

            const position = { left: _.subtract(event.x, 326)+'px', top: event.y+'px' };

            Object.assign(this.style, position)
            this.dialog.style = this.style
        }
    }

    hideContextMenu() {
        this.display = false;

        this.removeExpanded(this.contextMenuItems);
    }

    removeExpanded(items: any) {
        const me = this;

        _.forEach(items, (item) => {
            delete item.expanded;

            if (!_.isNil(item.items)) {
                me.removeExpanded(item.items);
            }
        });
    }
}
