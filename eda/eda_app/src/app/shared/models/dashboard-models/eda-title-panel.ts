import { EdaPanel } from '@eda/models/dashboard-models/eda-panel.model';

export type VerticalAlign = 'top' | 'center' | 'bottom';

export class EdaTitlePanel extends EdaPanel {
    fontsize: string;
    color: string;
/* SDA CUSTOM */    backgroundTransparent: boolean = false;
/* SDA CUSTOM */    baseWidth?: number; // Base width of the panel for proportional scaling
/* SDA CUSTOM */    verticalAlign?: VerticalAlign; // Vertical alignment of the title
/* SDA CUSTOM */    textColor?: string; // Text color of the title
/* SDA CUSTOM */    borderColor?: string; // Border color of the panel
/* SDA CUSTOM */    showBorder?: boolean; // Show/hide panel border
/* SDA CUSTOM */    backgroundColor?: string; // Panel background color

    constructor(init?: Partial<EdaTitlePanel>) {
        super(init);
        Object.assign(this, init);
    }

}