import { EdaPanel } from '@eda/models/dashboard-models/eda-panel.model';

export type DashboardPrivacy = 'public' | 'shared' | 'private' | 'group';

export class EdaTabsPanel extends EdaPanel {
    selectedDashboardIds: string[];

    constructor(init?: Partial<EdaTabsPanel>) {
        super(init);
        Object.assign(this, init);
    }
}
