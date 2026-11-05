import { Pipe, PipeTransform } from '@angular/core';
import { FileUtiles } from '@eda/services/service.index';

/**
 * Resolves a stored image reference (dashboard backgroundImage / KPI prefixImage)
 * into a displayable <img [src]> / CSS url(...) value.
 *
 * Accepts three shapes so both legacy and migrated dashboards render correctly:
 * - a base64 data URI (legacy, not migrated yet) -> used as-is
 * - an absolute http(s) URL -> used as-is
 * - a relative media library path (e.g. /media/img/xxx.png) -> resolved via FileUtiles.connection()
 */
@Pipe({
    name: 'mediaSrc'
})
export class MediaSrcPipe implements PipeTransform {
    constructor(private fileUtiles: FileUtiles) { }

    transform(value: string): string {
        if (!value) return value;
        if (value.startsWith('data:') || /^https?:\/\//.test(value)) return value;
        return this.fileUtiles.connection(value);
    }
}
