import { Component, OnInit, OnDestroy, Input, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { EdaDialog2 } from './eda-dialog2';
import { Dialog } from 'primeng/dialog';


import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button'; // if you use buttons inside the dialog
import { FormsModule } from '@angular/forms'; // for [(ngModel)] if you use it


@Component({
    standalone: true,
    selector: 'eda-dialog2',
    templateUrl: './eda-dialog2.component.html',
    imports: [
        CommonModule,
        DialogModule,
        ButtonModule,
        FormsModule
    ],
    styles: `
      ::ng-deep .p-dialog .p-dialog-footer {
        padding-bottom: 0.5rem;
      }

      :host ::ng-deep .p-dialog {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .switch-tab-btn {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        justify-content: center;
        border-radius: 0.375rem;
        padding: 0.5rem 1.25rem;
        min-width: 13vw;
        background: #ffffff;
        color: #374151;
        border: 1px solid #d1d5db;
        cursor: pointer;
        font-size: 0.875rem;
        transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
      }

      .switch-tab-btn:hover {
        background: #f3f4f6;
        border-color: #9ca3af;
        color: #111827;
      }
    `
})
export class EdaDialog2Component extends EdaDialog2 implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('dialogRef') dialogRef!: Dialog;
    @ViewChild('contentWrapper') contentWrapper!: ElementRef;
    @Input() overflow: string = 'hidden';
    @Input() draggable: string;
    /** Renders the same header/content/footer inline (no floating p-dialog) so it can be embedded inside another dialog */
    @Input() embedded: boolean = false;


    private resizeObserver!: ResizeObserver;

    // Getters (not fields set once in ngOnInit) so a dialog can toggle e.g. [showClose] at
    // runtime -- like hiding the outer dialog's Cancelar while an embedded form owns its own footer
    public get ifShowApply(): boolean { return this.apply.observers.length > 0 && this.showApply; }
    public get ifShowClose(): boolean { return this.close.observers.length > 0 && this.showClose; }
    public get ifShowReset(): boolean { return this.reset.observers.length > 0 && this.showReset; }
    public get ifShowDuplicate(): boolean { return this.duplicate.observers.length > 0 && this.showDuplicate; }
    public get ifShowDeleteFilter(): boolean { return this.delete.observers.length > 0 && this.showDelete; }
    public get ifNoStyles(): boolean { return this.notstyles.observers.length > 0 && this.showNotStyles; }
    public get ifShowNextStep(): boolean { return this.nextstep.observers.length > 0 && this.showNextStep; }
    public get ifShowSwitchRedirecction(): boolean { return this.switchredirecction.observers.length > 0 && this.showRedirecction; }
    public get ifShowCheckExpression(): boolean { return this.checkexpression.observers.length > 0 && this.showCheckExpression; }

    // Automatically translated for PrimeNG
    get translatedBreakpoints(): Record<string, string> {
        const result: Record<string, string> = {};
        for (const key in this.breakpoints) {
            const pixel = this.sizeMap[key];
            if (pixel) {
                result[pixel] = this.breakpoints[key];
            }
        }
        return result;
    }

    constructor(private cd: ChangeDetectorRef) {
        super();
    }

    public ngOnInit(): void {
        this.display = true;
    }

    ngAfterViewInit(): void {
        if (this.contentWrapper?.nativeElement) {
            this.resizeObserver = new ResizeObserver(() => {
                setTimeout(() => {
                    // Something breaks when deleting a filter
                    // this.dialogRef.center();
                    this.cd.detectChanges();
                }, 1000);
            });

            this.resizeObserver.observe(this.contentWrapper.nativeElement);
        }
    }

    public ngOnDestroy(): void {
        this.display = false;
        this.resizeObserver?.disconnect();
    }

}