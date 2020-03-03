import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'ids'
})
export class IdSelectionPipe implements PipeTransform {

    constructor() {}

    transform(items: any[], key: string, obj: any): any {
        const output = [];
        for (let i = 0, n = items.length; i < n; i += 1) {
            if (items[i][key]._id === obj._id) {
                output.push(items[i]);
            }
        }
        return output;
    }
}
