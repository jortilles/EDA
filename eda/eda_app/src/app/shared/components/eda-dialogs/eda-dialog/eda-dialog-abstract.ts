import { Input } from '@angular/core';
import { EdaDialogCloseEvent } from './eda-dialog';
import { EdaDialogController } from './eda-dialog-controller';
import * as _ from 'lodash';
export abstract class EdaDialogAbstract {
  visible = false;

  _controller: EdaDialogController;
  @Input('controller')
  set controller(value: EdaDialogController) {
    const me = this;
    me._controller = value;
    if (!_.isNil(me._controller)) {
      me.visible = true;
    }
  }
  get controller(): EdaDialogController {
    return this._controller;
  }

  abstract onShow(): void;
  abstract onClose(event: EdaDialogCloseEvent, response?: any): void;
}
