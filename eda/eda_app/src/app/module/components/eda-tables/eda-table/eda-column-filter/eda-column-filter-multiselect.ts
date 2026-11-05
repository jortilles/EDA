import { EdaColumnFilter } from './eda-column-filter';
import * as _ from 'lodash';

export class EdaColumnFilterMultiSelect extends EdaColumnFilter {
    constructor(options?: any) {
        super(options);

        this.type = 'EdaColumnFilterMultiSelect';
        if (_.isNil(this.comparationMethod)) {
            this.comparationMethod = 'in';
        }

        this.options = [];

        this.style = {width: '100%', 'text-align': 'center'};
    }

    init(values: any) {
        this.options = [];
        for (const obj of values) {
            if (!_.isNil(obj)) {
                this.options.push({label: obj, value: obj});
            }
        }

        this.ngModel = null;
    }
}
