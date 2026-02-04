import { EdaPanel } from '@eda/models/dashboard-models/eda-panel.model';

export interface TabStyle {
    backgroundColor: string;
    textColor: string;
    activeColor: string;
}

export interface SelectedDashboard {
    id: string;
    title: string;
    source: 'manual' | 'tag';
}

export class EdaTabsPanel extends EdaPanel {
    selectedTags: string[];
    selectedDashboardIds: string[];  // IDs de dashboards seleccionados manualmente
    excludedDashboardIds: string[];  // IDs de dashboards excluidos del resultado final
    tabStyle: TabStyle;

    constructor(init?: Partial<EdaTabsPanel>) {
        super(init);
        Object.assign(this, init);
    }
}
