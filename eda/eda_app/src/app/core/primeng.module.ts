import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColorPickerModule } from 'primeng/colorpicker';
import { TabViewModule } from 'primeng/tabview';
import { PanelModule } from 'primeng/panel';
import { DragDropModule } from 'primeng/dragdrop';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { ConfirmationService, MessageService } from 'primeng/api'
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { SlideMenuModule } from 'primeng/slidemenu';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SidebarModule } from 'primeng/sidebar';
import { MenuModule } from 'primeng/menu';
import { MenubarModule } from 'primeng/menubar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectButtonModule } from 'primeng/selectbutton';
import { PickListModule } from 'primeng/picklist';
import { ContextMenuModule } from 'primeng/contextmenu';
import { InputTextModule } from 'primeng/inputtext';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CardModule } from 'primeng/card';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { KeyFilterModule } from 'primeng/keyfilter';
import { PanelMenuModule } from 'primeng/panelmenu';
import { MessagesModule } from 'primeng/messages';
import { MessageModule } from 'primeng/message';
import { ListboxModule } from 'primeng/listbox';
import { TreeModule } from 'primeng/tree';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { VirtualScrollerModule } from 'primeng/virtualscroller';
import { ToastModule } from 'primeng/toast';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { AccordionModule } from 'primeng/accordion';
import { TooltipModule } from 'primeng/tooltip';
import { OrderListModule } from 'primeng/orderlist';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToolbarModule } from 'primeng/toolbar';
import { EditorModule } from 'primeng/editor';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { SliderModule } from 'primeng/slider';
import { TreeSelectModule } from 'primeng/treeselect';

@NgModule({
    providers: [ConfirmationService, MessageService],
    exports: [
        CommonModule,
        InputTextModule,
        MenuModule,
        MenubarModule,
        TieredMenuModule,
        SidebarModule,
        ButtonModule,
        RadioButtonModule,
        TreeSelectModule,
        TreeModule,
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
        KeyFilterModule,
        AccordionModule,
        TooltipModule,
        OrderListModule,
        InputNumberModule,
        ToolbarModule,
        EditorModule,
        ToggleButtonModule,
        MessageModule,
        SliderModule
    ]
})
export class PrimengModule { }
