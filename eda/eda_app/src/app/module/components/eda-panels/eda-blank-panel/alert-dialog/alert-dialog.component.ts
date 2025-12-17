import { EdaDialogCloseEvent, EdaDialog } from '@eda/shared/components/shared-components.index';
import { Component, Input, OnInit } from '@angular/core';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';

@Component({
  standalone: true,
  selector: 'app-alert-dialog',
  templateUrl: './alert-dialog.component.html',
  styleUrls: ['./alert-dialog.component.css'],
  imports: [EdaDialog2Component]
})

export class AlertDialogComponent implements OnInit {
  public dialog: EdaDialog;
  @Input() controller: any;
  constructor() {}

  close(execute: boolean) {
    this.onClose(EdaDialogCloseEvent.NONE, execute);
  }
  ngOnInit(): void {
  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

}