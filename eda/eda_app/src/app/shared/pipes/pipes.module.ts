import { NgModule } from '@angular/core';

import { ImagePipe } from './image.pipe';
import { IdSelectionPipe } from './id-selection.pipe';
import { MediaSrcPipe } from './media-src.pipe';


@NgModule({
    declarations: [
        ImagePipe,
        IdSelectionPipe,
        MediaSrcPipe,
    ],
    imports: [],
    exports: [
        ImagePipe,
        IdSelectionPipe,
        MediaSrcPipe
    ]
})
export class PipesModule { }
