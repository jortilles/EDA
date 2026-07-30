export interface PagePluginMeta {
    path: string;
    label: string;
    componentFile: string;
    componentExport: string;
    menuIcon?: string;
    menuSection?: 'main' | 'admin';
}
