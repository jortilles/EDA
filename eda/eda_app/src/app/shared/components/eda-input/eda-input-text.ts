import { EdaInput } from './eda-input';

export class EdaInputText extends EdaInput {
    
    constructor(init?: Partial<EdaInputText>) {
        super(init.ngModel);
        Object.assign(this, init);

        this.type = 'EdaInputText';

    }

    reset() {
        this._model.reset('');
    }
}