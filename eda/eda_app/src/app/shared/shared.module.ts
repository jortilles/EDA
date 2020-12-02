import { NgModule } from '@angular/core';

// Module
import { CoreModule } from '../core/core.module';
import { PipesModule } from './pipes/pipes.module';

// Directives
import { FocusOnShowDirective } from './directives/autofocus.directive';

// Components
import {
    EdaPageDialogComponent,
    EdaDialogComponent,
    NavbarComponent,
    SidebarComponent,
    EdaContextMenuComponent,
    EdaInputComponent,
    EdaDatePickerComponent
} from './components/shared-components.index';

@NgModule({
    declarations: [
        EdaPageDialogComponent,
        NavbarComponent,
        SidebarComponent,
        EdaDialogComponent,
        EdaDialogComponent,
        EdaContextMenuComponent,
        EdaInputComponent,
        FocusOnShowDirective,
        EdaDatePickerComponent
    ],
    imports: [
        CoreModule,
        PipesModule
    ],
    exports: [
        EdaPageDialogComponent,
        NavbarComponent,
        SidebarComponent,
        EdaDialogComponent,
        PipesModule,
        EdaDialogComponent,
        EdaContextMenuComponent,
        EdaInputComponent,
        FocusOnShowDirective,
        EdaDatePickerComponent
    ]
})
export class SharedModule {}
