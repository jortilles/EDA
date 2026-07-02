import { DashboardService } from './../../../../services/api/dashboard.service';
import { Component, OnInit, Input, Output, EventEmitter, ViewEncapsulation, ViewChild, ElementRef, AfterViewInit, OnDestroy, ChangeDetectorRef } from "@angular/core";
import { InjectEdaPanel, EdaTitlePanel } from '@eda/models/model.index';
import { EdaContextMenu, EdaContextMenuItem, EdaDialogCloseEvent, EdaDialogController } from '@eda/shared/components/shared-components.index';
import { DomSanitizer } from '@angular/platform-browser'
import {SafeHtmlPipe} from './htmlSanitizer.pipe'
import {SafeUrlPipe} from './urlSanitizer.pipe'
import * as _ from 'lodash';
import { environment } from 'environments/environment';

@Component({
    selector: 'eda-title-panel',
    templateUrl: './eda-title-panel.component.html',
    styleUrls: ['./eda-title-panel.component.css'],
    encapsulation: ViewEncapsulation.None
})

export class EdaTitlePanelComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input() id: string;
    @Input() panel: EdaTitlePanel;
    @Input() inject: InjectEdaPanel;
    @Output() remove: EventEmitter<any> = new EventEmitter();
/* SDA CUSTOM */    @Output() duplicate: EventEmitter<any> = new EventEmitter();
/* SDA CUSTOM */    @ViewChild('titleContainer') titleContainer: ElementRef;

    titleClick: boolean = false;
    contextMenu: EdaContextMenu;
    editTittleController: EdaDialogController;
    display: any = {
        editMode: true
    }
    public htmlPipe : SafeHtmlPipe
    public urlPipe : SafeUrlPipe
/* SDA CUSTOM */    public lockPanelTooltip: string = $localize`:@@lockPanel:Lock panel`;
/* SDA CUSTOM */    public unlockPanelTooltip: string = $localize`:@@unlockPanel:Unlock panel`;
/* SDA CUSTOM */    private resizeObserver: ResizeObserver;
/* SDA CUSTOM */    private readonly scaleTolerance = 0.05; // Tolerance to recalculate scale
/* SDA CUSTOM */    public scaledTitle: string = '';

    constructor(public sanitized: DomSanitizer, public dashboardService : DashboardService, private cdr: ChangeDetectorRef){}
    

    ngOnInit(): void {
        this.initContextMenu()
        this.setEditMode();
    }

/* SDA CUSTOM */    ngAfterViewInit(): void {
/* SDA CUSTOM */        this.initResizeObserver();
/* SDA CUSTOM */        setTimeout(() => {
/* SDA CUSTOM */            this.scaledTitle = this.computeScaledTitle();
/* SDA CUSTOM */            this.cdr.detectChanges();
/* SDA CUSTOM */        });
/* SDA CUSTOM */    }

/* SDA CUSTOM */    ngOnDestroy(): void {
/* SDA CUSTOM */        if (this.resizeObserver) {
/* SDA CUSTOM */            this.resizeObserver.disconnect();
/* SDA CUSTOM */        }
/* SDA CUSTOM */    }

/* SDA CUSTOM */    private initResizeObserver(): void {
/* SDA CUSTOM */        if (this.titleContainer && 'ResizeObserver' in window) {
/* SDA CUSTOM */            this.resizeObserver = new ResizeObserver((entries) => {
/* SDA CUSTOM */                for (const entry of entries) {
/* SDA CUSTOM */                    if (this.panel.baseWidth && entry.contentRect.width > 0) {
/* SDA CUSTOM */                        requestAnimationFrame(() => {
/* SDA CUSTOM */                            this.scaledTitle = this.computeScaledTitle();
/* SDA CUSTOM */                            this.cdr.detectChanges();
/* SDA CUSTOM */                        });
/* SDA CUSTOM */                    }
/* SDA CUSTOM */                }
/* SDA CUSTOM */            });
/* SDA CUSTOM */            this.resizeObserver.observe(this.titleContainer.nativeElement);
/* SDA CUSTOM */        }
/* SDA CUSTOM */    }

/* SDA CUSTOM */    // Calculates scale factor based on current width and height vs base dimensions
/* SDA CUSTOM */    // Maximizes use of available space both horizontally and vertically
/* SDA CUSTOM */    getScale(): number {
/* SDA CUSTOM */        if (!this.panel.baseWidth || this.panel.baseWidth <= 0) {
/* SDA CUSTOM */            return 1;
/* SDA CUSTOM */        }
/* SDA CUSTOM */        if (!this.titleContainer || !this.titleContainer.nativeElement) {
/* SDA CUSTOM */            return 1;
/* SDA CUSTOM */        }
/* SDA CUSTOM */        const currentWidth = this.titleContainer.nativeElement.offsetWidth;
/* SDA CUSTOM */        const currentHeight = this.titleContainer.nativeElement.offsetHeight;
/* SDA CUSTOM */        if (currentWidth <= 0 || currentHeight <= 0) {
/* SDA CUSTOM */            return 1;
/* SDA CUSTOM */        }
/* SDA CUSTOM */        // Estimate typical base height (proportional to base width with 1:4 ratio approx)
/* SDA CUSTOM */        const baseHeight = this.panel.baseWidth / 4;
/* SDA CUSTOM */        // Calculate width and height ratios
/* SDA CUSTOM */        const widthRatio = currentWidth / this.panel.baseWidth;
/* SDA CUSTOM */        const heightRatio = currentHeight / baseHeight;
/* SDA CUSTOM */        // Use the ratio that allows leveraging more space (the larger one, but limited)
/* SDA CUSTOM */        // This allows text to grow if vertical space is available
/* SDA CUSTOM */        let ratio = Math.max(widthRatio, heightRatio * 0.8); // 0.8 to give vertical safety margin
/* SDA CUSTOM */        // Only scale if there is significant change (outside tolerance)
/* SDA CUSTOM */        if (ratio >= (1 - this.scaleTolerance) && ratio <= (1 + this.scaleTolerance)) {
/* SDA CUSTOM */            return 1;
/* SDA CUSTOM */        }
/* SDA CUSTOM */        return ratio;
/* SDA CUSTOM */    }

/* SDA CUSTOM */    // Returns CSS style for the title container
/* SDA CUSTOM */    // Includes the vertical alignment selected by the user
/* SDA CUSTOM */    getTitleStyle(): any {
/* SDA CUSTOM */        const align = this.panel.verticalAlign || 'center';
/* SDA CUSTOM */        let alignItems = 'center';
/* SDA CUSTOM */        if (align === 'top') alignItems = 'flex-start';
/* SDA CUSTOM */        else if (align === 'bottom') alignItems = 'flex-end';
/* SDA CUSTOM */
/* SDA CUSTOM */        return {
/* SDA CUSTOM */            'display': 'flex',
/* SDA CUSTOM */            'align-items': alignItems,
/* SDA CUSTOM */            'transform-origin': 'left center'
/* SDA CUSTOM */        };
/* SDA CUSTOM */    }

/* SDA CUSTOM */    // Indicates if the panel should use minimal style (no borders or background)
/* SDA CUSTOM */    isMinimalStyle(): boolean {
/* SDA CUSTOM */        const showBorder = this.panel.showBorder !== false;
/* SDA CUSTOM */        return !showBorder && this.panel.backgroundTransparent;
/* SDA CUSTOM */    }

/* SDA CUSTOM */    // Returns CSS style for the panel (borders)
    /* SDA CUSTOM */    // When there is no border or background, the panel is completely clean/minimalist
    /* SDA CUSTOM */    getPanelStyle(): any {
    /* SDA CUSTOM */        const showBorder = this.panel.showBorder !== false; // default true
    /* SDA CUSTOM */        const borderColor = this.panel.borderColor || '#d7dde6';
    /* SDA CUSTOM */        const backgroundTransparent = this.panel.backgroundTransparent;
    /* SDA CUSTOM */        
    /* SDA CUSTOM */        // In minimalist mode, remove ALL borders and shadows
    /* SDA CUSTOM */        if (!showBorder && backgroundTransparent) {
    /* SDA CUSTOM */            return {
    /* SDA CUSTOM */                'border': 'none',
    /* SDA CUSTOM */                'border-top': 'none',
    /* SDA CUSTOM */                'border-bottom': 'none',
    /* SDA CUSTOM */                'border-left': 'none',
    /* SDA CUSTOM */                'border-right': 'none',
    /* SDA CUSTOM */                'border-radius': '0',
    /* SDA CUSTOM */                'box-shadow': 'none',
    /* SDA CUSTOM */                '-webkit-box-shadow': 'none',
    /* SDA CUSTOM */                'background': 'transparent',
    /* SDA CUSTOM */                'outline': 'none'
    /* SDA CUSTOM */            };
    /* SDA CUSTOM */        }
    /* SDA CUSTOM */        
    /* SDA CUSTOM */        return {
    /* SDA CUSTOM */            'border': showBorder ? `1px solid ${borderColor}` : 'none',
    /* SDA CUSTOM */            'border-top': showBorder ? `1px solid ${borderColor}` : 'none',
    /* SDA CUSTOM */            'border-bottom': showBorder ? `1px solid ${borderColor}` : 'none',
    /* SDA CUSTOM */            'border-left': showBorder ? `1px solid ${borderColor}` : 'none',
    /* SDA CUSTOM */            'border-right': showBorder ? `1px solid ${borderColor}` : 'none',
    /* SDA CUSTOM */            'border-radius': showBorder ? '4px' : '0',
    /* SDA CUSTOM */            'box-shadow': 'none',
    /* SDA CUSTOM */            'background': backgroundTransparent ? 'transparent' : (this.panel.backgroundColor || undefined)
    /* SDA CUSTOM */        };
    /* SDA CUSTOM */    }

/* SDA CUSTOM */    // Processes the title HTML and adjusts font sizes according to scale factor
/* SDA CUSTOM */    getScaledTitle(): string {
/* SDA CUSTOM */        return this.scaledTitle || this.panel.title || '';
/* SDA CUSTOM */    }

/* SDA CUSTOM */    private computeScaledTitle(): string {
/* SDA CUSTOM */        if (!this.panel.title) {
/* SDA CUSTOM */            return '';
/* SDA CUSTOM */        }
/* SDA CUSTOM */        const scale = this.getScale();
/* SDA CUSTOM */        if (scale === 1) {
/* SDA CUSTOM */            return this.panel.title;
/* SDA CUSTOM */        }
/* SDA CUSTOM */        const limitedScale = Math.min(scale, 1.3);
/* SDA CUSTOM */        return this.adjustFontSizes(this.panel.title, limitedScale);
/* SDA CUSTOM */    }

/* SDA CUSTOM */    // Adjusts font sizes in HTML according to scale factor
/* SDA CUSTOM */    private adjustFontSizes(html: string, scale: number): string {
/* SDA CUSTOM */        if (!html || scale === 1) {
/* SDA CUSTOM */            return html;
/* SDA CUSTOM */        }
/* SDA CUSTOM */        // Create a temporary div to parse the HTML
/* SDA CUSTOM */        const tempDiv = document.createElement('div');
/* SDA CUSTOM */        tempDiv.innerHTML = html;
/* SDA CUSTOM */        // Adjust font sizes in elements with inline style
/* SDA CUSTOM */        const elementsWithStyle = tempDiv.querySelectorAll('[style*="font-size"]');
/* SDA CUSTOM */        elementsWithStyle.forEach(el => {
/* SDA CUSTOM */            const style = el.getAttribute('style') || '';
/* SDA CUSTOM */            const newStyle = this.scaleFontSizeInStyle(style, scale);
/* SDA CUSTOM */            el.setAttribute('style', newStyle);
/* SDA CUSTOM */        });
/* SDA CUSTOM */        // Adjust span elements with Quill sizes (ql-size-*)
/* SDA CUSTOM */        const sizeClasses = ['ql-size-small', 'ql-size-large', 'ql-size-huge'];
/* SDA CUSTOM */        sizeClasses.forEach(className => {
/* SDA CUSTOM */            const elements = tempDiv.querySelectorAll(`.${className}`);
/* SDA CUSTOM */            elements.forEach(el => {
/* SDA CUSTOM */                let currentSize = 16;
/* SDA CUSTOM */                if (className === 'ql-size-small') currentSize = 10;
/* SDA CUSTOM */                else if (className === 'ql-size-large') currentSize = 18;
/* SDA CUSTOM */                else if (className === 'ql-size-huge') currentSize = 32;
/* SDA CUSTOM */                const newSize = Math.round(currentSize * scale);
/* SDA CUSTOM */                el.classList.remove(className);
/* SDA CUSTOM */                const currentStyle = el.getAttribute('style') || '';
/* SDA CUSTOM */                el.setAttribute('style', `${currentStyle}; font-size: ${newSize}px;`.replace(/^; /, ''));
/* SDA CUSTOM */            });
/* SDA CUSTOM */        });
/* SDA CUSTOM */        return tempDiv.innerHTML;
/* SDA CUSTOM */    }

/* SDA CUSTOM */    // Scales font size in a CSS style string
/* SDA CUSTOM */    private scaleFontSizeInStyle(style: string, scale: number): string {
/* SDA CUSTOM */        const fontSizeMatch = style.match(/font-size:\s*(\d+)px/);
/* SDA CUSTOM */        if (fontSizeMatch) {
/* SDA CUSTOM */            const currentSize = parseInt(fontSizeMatch[1], 10);
/* SDA CUSTOM */            const newSize = Math.round(currentSize * scale);
/* SDA CUSTOM */            return style.replace(/font-size:\s*\d+px/, `font-size: ${newSize}px`);
/* SDA CUSTOM */        }
/* SDA CUSTOM */        return style;
/* SDA CUSTOM */    }

/* SDA CUSTOM */   public toggleLock(): void {
/* SDA CUSTOM */       this.panel.locked = !this.panel.locked;
/* SDA CUSTOM */       this.dashboardService._notSaved.next(true);
/* SDA CUSTOM */   }

    public setEditMode(): void {
        const user = localStorage.getItem('user');
        const userName = JSON.parse(user).name;
        this.display.editMode = (userName !== 'edaanonim' && !this.inject.isObserver);
    }

    public initContextMenu(): void {
        this.contextMenu = new EdaContextMenu({
            header: $localize`:@@panelOptions0:PANEL OPTIONS`,
            contextMenuItems: [
                new EdaContextMenuItem({
                    label: $localize`:@@panelOptions2:Edit chart options`,
                    icon: 'mdi mdi-wrench',
                    command: () => {
                        
                        this.contextMenu.hideContextMenu();

                        // SDA CUSTOM - Get current container width for proportional scaling
/* SDA CUSTOM */                        const currentWidth = this.titleContainer?.nativeElement?.offsetWidth || 0;
/* SDA CUSTOM */                        const baseWidth = this.panel.baseWidth || currentWidth;

                        this.editTittleController = new EdaDialogController({
                        /* SDA CUSTOM */ params: { title: this.panel.title, backgroundTransparent: this.panel.backgroundTransparent, baseWidth: baseWidth, verticalAlign: this.panel.verticalAlign, borderColor: this.panel.borderColor, showBorder: this.panel.showBorder, backgroundColor: this.panel.backgroundColor },
                            close: (event, response) => {
                                if(!_.isEqual(event, EdaDialogCloseEvent.NONE)){
                                    this.panel.title = response.title;
/* SDA CUSTOM */ this.panel.backgroundTransparent = response.backgroundTransparent;
/* SDA CUSTOM */                                    this.scaledTitle = '';
/* SDA CUSTOM */                                    setTimeout(() => { this.scaledTitle = this.computeScaledTitle(); this.cdr.detectChanges(); });
                                    // SDA CUSTOM - Save base width for proportional scaling (only if new)
/* SDA CUSTOM */                                    if (!this.panel.baseWidth && response.baseWidth) {
/* SDA CUSTOM */                                        this.panel.baseWidth = response.baseWidth;
                                    }
                                    // SDA CUSTOM - Save vertical alignment
/* SDA CUSTOM */                                    this.panel.verticalAlign = response.verticalAlign || 'center';
                                    // SDA CUSTOM - Save appearance options
/* SDA CUSTOM */                                    this.panel.borderColor = response.borderColor || '#d7dde6';
/* SDA CUSTOM */                                    this.panel.showBorder = response.showBorder !== false;
                                    // SDA CUSTOM - Save background color
/* SDA CUSTOM */                                    this.panel.backgroundColor = response.backgroundColor || '#ffffff';
                                    this.setPanelSize()
                                    this.dashboardService._notSaved.next(true);
                                }
                                this.editTittleController = null;
                            }
                          });
                    }
                }),
/* SDA CUSTOM */                new EdaContextMenuItem({
/* SDA CUSTOM */                    label: $localize`:@@duplicatePanel:Duplicar panel`,
/* SDA CUSTOM */                    icon: 'fa fa-copy',
/* SDA CUSTOM */                    command: () => {
/* SDA CUSTOM */                        this.contextMenu.hideContextMenu();
/* SDA CUSTOM */                        this.duplicatePanel();
/* SDA CUSTOM */                    }
                }),
                new EdaContextMenuItem({
                    label: $localize`:@@panelOptions4:Delete panel`,
                    icon: 'fa fa-trash',
                    command: () => {
                        this.contextMenu.hideContextMenu();
                        this.removePanel();
                    }
                }),
            ]
        });

    }
    
    public removePanel(): void {
        this.remove.emit(this.panel.id);
    }

/* SDA CUSTOM */     public openEditDialog(): void {
/* SDA CUSTOM */         // Get current container width for proportional scaling
/* SDA CUSTOM */         const currentWidth = this.titleContainer?.nativeElement?.offsetWidth || 0;
/* SDA CUSTOM */         const baseWidth = this.panel.baseWidth || currentWidth;
/* SDA CUSTOM */
/* SDA CUSTOM */         this.editTittleController = new EdaDialogController({
/* SDA CUSTOM */             params: { title: this.panel.title, backgroundTransparent: this.panel.backgroundTransparent, baseWidth: baseWidth, verticalAlign: this.panel.verticalAlign, borderColor: this.panel.borderColor, showBorder: this.panel.showBorder, backgroundColor: this.panel.backgroundColor },
/* SDA CUSTOM */             close: (event, response) => {
/* SDA CUSTOM */                 if(!_.isEqual(event, EdaDialogCloseEvent.NONE)){
/* SDA CUSTOM */                     this.panel.title = response.title;
/* SDA CUSTOM */                     this.panel.backgroundTransparent = response.backgroundTransparent;
/* SDA CUSTOM */                     this.scaledTitle = '';
/* SDA CUSTOM */                     setTimeout(() => { this.scaledTitle = this.computeScaledTitle(); this.cdr.detectChanges(); });
/* SDA CUSTOM */                     // Save base width for proportional scaling (only if new)
/* SDA CUSTOM */                     if (!this.panel.baseWidth && response.baseWidth) {
/* SDA CUSTOM */                         this.panel.baseWidth = response.baseWidth;
/* SDA CUSTOM */                     }
/* SDA CUSTOM */                     // Save vertical alignment
/* SDA CUSTOM */                     this.panel.verticalAlign = response.verticalAlign || 'center';
/* SDA CUSTOM */                     // Save appearance options
/* SDA CUSTOM */                     this.panel.borderColor = response.borderColor || '#d7dde6';
/* SDA CUSTOM */                     this.panel.showBorder = response.showBorder !== false;
/* SDA CUSTOM */                     // Save background color
/* SDA CUSTOM */                     this.panel.backgroundColor = response.backgroundColor || '#ffffff';
/* SDA CUSTOM */                     this.setPanelSize()
/* SDA CUSTOM */                     this.dashboardService._notSaved.next(true);
/* SDA CUSTOM */                 }
/* SDA CUSTOM */                 this.editTittleController = null;
/* SDA CUSTOM */             }
/* SDA CUSTOM */         });
/* SDA CUSTOM */     }

/* SDA CUSTOM */    public duplicatePanel(): void {
/* SDA CUSTOM */        const duplicatedPanel = _.cloneDeep(this.panel, true);
/* SDA CUSTOM */        duplicatedPanel.id = this.generateUUID();
/* SDA CUSTOM */        duplicatedPanel.y = duplicatedPanel.y + 1;
/* SDA CUSTOM */        const sourcePanelId = this.panel.id;
/* SDA CUSTOM */        this.duplicate.emit({ panel: duplicatedPanel, sourcePanelId: sourcePanelId });
/* SDA CUSTOM */    }

/* SDA CUSTOM */    private generateUUID(): string {
/* SDA CUSTOM */        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
/* SDA CUSTOM */            const r = Math.random() * 16 | 0;
/* SDA CUSTOM */            const v = c === 'x' ? r : (r & 0x3 | 0x8);
/* SDA CUSTOM */            return v.toString(16);
/* SDA CUSTOM */        });
/* SDA CUSTOM */    }

    public setPanelSize(): void {
        let element: any;
        if (environment.production) {
            element = document.querySelector(`[id^="${this.panel.id.substring(0,30)}"]`);
        } else {
            element = document.querySelector(`[ng-reflect-id^="${this.panel.id.substring(0,30)}"]`);
        }

        let parentElement: any = element?.parentNode;
        
        if (parentElement) {
            let parentWidth = parentElement.offsetWidth - 20;
            let parentHeight = parentElement.offsetHeight - 20;
            
            
            if (this.panel.title.includes('img')) {
                this.panel.title = this.panel.title.replace('<img', `<img style="max-height: ${parentHeight}px; max-width: ${parentWidth}px;"`);
            }
        }
    }
}