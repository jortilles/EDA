import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  InputTextModule, MenuModule, MenubarModule, TieredMenuModule,
  SidebarModule, ButtonModule, RadioButtonModule, SlideMenuModule,
  DropdownModule, MultiSelectModule, ProgressBarModule, ConfirmDialogModule,
  DialogModule, ConfirmationService, OverlayPanelModule, DragDropModule, CardModule,
  PanelModule, TabViewModule, ColorPickerModule, ProgressSpinnerModule, ContextMenuModule,
  InputSwitchModule, ScrollPanelModule, CalendarModule, TreeModule, SelectButtonModule, CheckboxModule,
  ListboxModule, MessagesModule, PickListModule, PanelMenuModule, KeyFilterModule
} from 'primeng/primeng';


import {VirtualScrollerModule} from 'primeng/virtualscroller';
import {ToastModule} from 'primeng/toast';
import {ChartModule} from 'primeng/chart';
import {TableModule} from 'primeng/table';

@NgModule({
  providers: [ConfirmationService],
  exports: [
    CommonModule,
    InputTextModule,
    MenuModule,
    MenubarModule,
    TieredMenuModule,
    SidebarModule,
    ButtonModule,
    RadioButtonModule,
    SlideMenuModule,
    DropdownModule,
    MultiSelectModule,
    ProgressBarModule,
    ConfirmDialogModule,
    DialogModule,
    OverlayPanelModule,
    DragDropModule,
    CardModule,
    ToastModule,
    MessagesModule,
    ChartModule,
    PanelModule,
    TabViewModule,
    ColorPickerModule,
    TableModule,
    ProgressSpinnerModule,
    ContextMenuModule,
    InputSwitchModule,
    ScrollPanelModule,
    CalendarModule,
    CheckboxModule,
    TreeModule,
    SelectButtonModule,
    VirtualScrollerModule,
    ListboxModule,
    PickListModule,
    PanelMenuModule,
    KeyFilterModule
  ]
})
export class PrimengModule {}
