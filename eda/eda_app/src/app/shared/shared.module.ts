import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

// Module



// Directives
import { FocusOnShowDirective } from './directives/autofocus.directive';

// Components
import {
    EdaPageDialogComponent,
    NavbarComponent,
    EdaInputComponent,
    EdaFieldComponent
} from './components/shared-components.index';
import { PrimengModule } from 'app/core/primeng.module';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';
import { EdaListComponent } from './components/eda-list/eda-list.component';

@NgModule({
    imports: [
    PrimengModule,
    FocusOnShowDirective,
    EdaListComponent,
    SweetAlert2Module.forRoot(),
    EdaPageDialogComponent,
    NavbarComponent,
    EdaInputComponent,
    EdaFieldComponent
],
    exports: [
    EdaPageDialogComponent,
    NavbarComponent,
    EdaInputComponent,
    FocusOnShowDirective,
    EdaFieldComponent,
],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedModule {}
