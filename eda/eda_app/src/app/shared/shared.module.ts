import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

// Module
import { CoreModule } from '../core/core.module';
import { PipesModule } from './pipes/pipes.module';

// Directives
import { FocusOnShowDirective } from './directives/autofocus.directive';

// Components
import {
    EdaPageDialogComponent,
    EdaDialogComponent,
    EdaDialog2Component,
    NavbarComponent,
    EdaContextMenuComponent,
    EdaInputComponent,
    EdaDatePickerComponent,
    EdaFieldComponent
} from './components/shared-components.index';
import { PrimengModule } from 'app/core/primeng.module';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';
import { GlobalFilterDialogComponent } from 'app/module/pages/dashboard/global-filter-dialog/global-filter-dialog.component';
import { EdaListComponent } from './components/eda-list/eda-list.component';

@NgModule({
    declarations: [
        EdaPageDialogComponent,
        NavbarComponent,
        EdaDialogComponent,
        EdaDialog2Component,
        EdaContextMenuComponent,
        EdaInputComponent,
        FocusOnShowDirective,
        EdaDatePickerComponent,
        EdaFieldComponent,
        GlobalFilterDialogComponent,
    ],
    imports: [
        PrimengModule,
        CoreModule,
        EdaListComponent,
        SweetAlert2Module.forRoot(),
        PipesModule
    ],
    exports: [
        EdaPageDialogComponent,
        NavbarComponent,
        EdaDialogComponent,
        PipesModule,
        EdaDialogComponent,
        EdaDialog2Component,
        EdaContextMenuComponent,
        EdaInputComponent,
        FocusOnShowDirective,
        EdaDatePickerComponent,
        EdaFieldComponent,
        GlobalFilterDialogComponent,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedModule {}
