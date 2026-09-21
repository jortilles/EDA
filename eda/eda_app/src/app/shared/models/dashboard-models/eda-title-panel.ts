import { EdaPanel } from '@eda/models/dashboard-models/eda-panel.model';

export type VerticalAlign = 'top' | 'center' | 'bottom';

export class EdaTitlePanel extends EdaPanel {
    fontsize: string;
    color: string;
    backgroundTransparent: boolean = false;
    verticalAlign?: VerticalAlign; // Vertical alignment of the title
    borderColor?: string; // Border color of the panel
    showBorder?: boolean; // Show/hide panel border
    backgroundColor?: string; // Panel background color

    constructor(init?: Partial<EdaTitlePanel>) {
        super(init);
        Object.assign(this, init);
    }

}
