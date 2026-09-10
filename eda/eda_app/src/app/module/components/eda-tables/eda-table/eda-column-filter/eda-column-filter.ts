import * as _ from 'lodash';

export class EdaColumnFilter {
    public type: string;
    public options: any;
    public style: any;
    public comparationMethod: any;
    public ngModel: any;

    constructor(options: any) {
        const me = this;

        if (!_.isNil(options)) {
            if (!_.isNil(options.comparationMethod)) {
                me.comparationMethod = options.comparationMethod;
            }
        }
    }

    init(values: any) {}
}
