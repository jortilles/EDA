import { EdaDialogCloseEvent } from './eda-dialog';

export class EdaDialogController {
  params: any;
  close: (event: EdaDialogCloseEvent, response?: any, extra?: any) => void = () => {};

  constructor(init: Partial<EdaDialogController>) {
    Object.assign(this, init);
  }
}
