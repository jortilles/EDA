import { NgModule } from '@angular/core';

// Module
import { GlobalModule } from '../module/global/global.module';
import { PipesModule } from './pipes/pipes.module';

// Directives
import { BlockCopyPaste } from './directives/block-copy-paste.directive';

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
        EdaContextMenuComponent,
        BlockCopyPaste
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
        EdaContextMenuComponent,
        BlockCopyPaste
    ]
})
export class SharedModule {}
