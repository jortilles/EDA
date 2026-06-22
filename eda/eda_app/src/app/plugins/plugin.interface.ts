import { Type } from '@angular/core';

interface IBasePlugin {
    key: string;
    label: string;
}

export interface IChartPlugin extends IBasePlugin {
    type: 'chart';
    component: Type<any>;
    icon: string;
    chartTypes: string[];
}

export interface IPagePlugin extends IBasePlugin {
    type: 'page';
    component: Type<any>;
    route: string;
    menuIcon: string;
    menuSection: 'main' | 'admin';
}

export interface IWidgetPlugin extends IBasePlugin {
    type: 'widget';
    component: Type<any>;
    minWidth?: number;
    minHeight?: number;
}

export interface IActionPlugin extends IBasePlugin {
    type: 'action';
    component: Type<any>;
    icon: string;
    context: 'dashboard' | 'panel' | 'datasource';
}

export type IPlugin = IChartPlugin | IPagePlugin | IWidgetPlugin | IActionPlugin;
