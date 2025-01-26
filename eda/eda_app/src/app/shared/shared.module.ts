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
    CreateDashboardComponent,
    EdaFieldComponent
} from './components/shared-components.index';
import { PrimengModule } from 'app/core/primeng.module';

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
        CreateDashboardComponent,
        EdaFieldComponent
    ],
    imports: [
        PrimengModule,
        CoreModule,
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
        CreateDashboardComponent,
        EdaFieldComponent
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedModule {}
