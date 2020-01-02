import { NgModule } from '@angular/core';

// Module
import { GlobalModule } from '../module/global/global.module';
import { PipesModule } from './pipes/pipes.module';

// Components
import {
    EdaPageDialogComponent,
    EdaDialogComponent,
    NavbarComponent,
    SidebarComponent,
    EdaContextMenuComponent
} from './components/shared-components.index';

@NgModule({
    declarations: [
        EdaPageDialogComponent,
        NavbarComponent,
        SidebarComponent,
        EdaDialogComponent,
        EdaDialogComponent,
        EdaContextMenuComponent
    ],
    imports: [
        GlobalModule,
        PipesModule
    ],
    exports: [
        EdaPageDialogComponent,
        NavbarComponent,
        SidebarComponent,
        EdaDialogComponent,
        PipesModule,
        EdaDialogComponent,
        EdaContextMenuComponent
    ]
})
export class SharedModule {}
