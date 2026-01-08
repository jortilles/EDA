import { Component, OnInit, OnDestroy, Input, AfterViewInit, ViewChild, ElementRef, ContentChild, AfterContentInit, ChangeDetectorRef } from '@angular/core';
import { EdaDialog2 } from './eda-dialog2';
import { Dialog } from 'primeng/dialog';


import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button'; // si usas botones dentro del diálogo
import { FormsModule } from '@angular/forms'; // para [(ngModel)] si lo usas


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
    `
})
export class EdaDialog2Component extends EdaDialog2 implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('dialogRef') dialogRef!: Dialog;
    @ViewChild('contentWrapper') contentWrapper!: ElementRef;
    @Input() overflow: string = 'hidden';
    @Input() draggable: string;


    private resizeObserver!: ResizeObserver;
    public ifShowApply: boolean;
    public ifShowClose: boolean;
    public ifShowReset: boolean;
    public ifShowDuplicate: boolean;
    public ifShowDeleteFilter: boolean;

    // Traducido automáticamente para PrimeNG
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

        this.ifShowApply = this.apply.observers.length > 0 && this.showApply;
        this.ifShowClose = this.close.observers.length > 0 && this.showClose;
        this.ifShowDuplicate = this.duplicate.observers.length > 0 && this.showDuplicate;
        this.ifShowReset = this.reset.observers.length > 0 && this.showReset;
        this.ifShowDeleteFilter = this.delete.observers.length > 0 && this.showDelete;
    }

    ngAfterViewInit(): void {
        if (this.contentWrapper?.nativeElement) {
            this.resizeObserver = new ResizeObserver(() => {
                setTimeout(() => {
                    // Algo peta al eliminar un filtro
                    console.log('obersavando...')
//                    this.dialogRef.center();
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