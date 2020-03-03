import { NgModule } from '@angular/core';

import { ImagePipe } from './image.pipe';
import { IdSelectionPipe } from './id-selection.pipe';


@NgModule({
    declarations: [
        ImagePipe,
        IdSelectionPipe,
    ],
    imports: [],
    exports: [
        ImagePipe,
        IdSelectionPipe
    ]
})
export class PipesModule { }
