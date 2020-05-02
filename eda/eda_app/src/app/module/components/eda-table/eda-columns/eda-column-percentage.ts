import { EdaColumn } from './eda-column';

export class EdaColumnPercentage extends EdaColumn {

  constructor(init: Partial<EdaColumnPercentage>) {
      super();
      Object.assign(this, init);
      this.type = 'EdaColumnPercentage';
  }

}