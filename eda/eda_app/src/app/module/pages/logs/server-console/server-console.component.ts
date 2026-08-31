import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputSwitchModule } from 'primeng/inputswitch';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { LogService, AlertService } from '@eda/services/service.index';
import { LogPeriodFilterComponent, LogDateRangeChange } from '../log-period-filter/log-period-filter.component';

const POLL_INTERVAL_MS = 4000;

@Component({
    standalone: true,
    selector: 'app-server-console',
    templateUrl: './server-console.component.html',
    styleUrls: ['./server-console.component.css'],
    imports: [CommonModule, FormsModule, InputSwitchModule, LogPeriodFilterComponent]
})
export class ServerConsoleComponent implements AfterViewInit, OnDestroy {

    @ViewChild('consoleOutput') consoleOutput: ElementRef<HTMLElement>;

    private readonly file: 'access' = 'access';
    // p-tabView keeps inactive panels in the DOM hidden via [hidden] rather than removing them,
    // so scrolling while hidden (height 0) has no effect. Re-scroll when the panel actually becomes visible.
    private visibilityObserver: ResizeObserver | null = null;

    public content: string = '';
    public liveMode: boolean = true;
    // Live tailing only makes sense while viewing a range that reaches today — a past day is a frozen view
    public includesToday: boolean = true;
    public resetNotice: boolean = false;
    public loading: boolean = false;

    public liveToggleLabel: string = $localize`:@@ServerConsoleLive:En vivo`;
    public resetNoticeText: string = $localize`:@@ServerConsoleReset:El fichero de log se reinició.`;
    public emptyText: string = $localize`:@@ServerConsoleEmpty:Sin contenido.`;

    private offset: number = 0;
    private pollSubscription: Subscription | null = null;

    constructor(
        private logService: LogService,
        private alertService: AlertService
    ) { }

    ngAfterViewInit(): void {
        const el = this.consoleOutput?.nativeElement;
        if (!el) return;
        this.updateConsoleHeight();
        window.addEventListener('resize', this.updateConsoleHeight);
        if (typeof ResizeObserver === 'undefined') return;
        // Fires when the hidden tab panel becomes visible (height goes from 0 to its real size)
        this.visibilityObserver = new ResizeObserver(() => {
            this.updateConsoleHeight();
            this.scrollToBottom();
        });
        this.visibilityObserver.observe(el);
    }

    ngOnDestroy(): void {
        this.stopPolling();
        this.visibilityObserver?.disconnect();
        window.removeEventListener('resize', this.updateConsoleHeight);
    }

    // Fill the viewport height remaining below the console box, so the page itself never scrolls
    // and only the console's own inner scrollbar is used — recalculated on resize/tab-visibility.
    private updateConsoleHeight = () => {
        const el = this.consoleOutput?.nativeElement;
        if (!el) return;
        const top = el.getBoundingClientRect().top;
        const bottomMargin = 30;
        const height = Math.max(240, window.innerHeight - top - bottomMargin);
        el.style.height = `${height}px`;
    };

    onLiveToggle() {
        if (this.liveMode && this.includesToday) {
            this.startPolling();
        } else {
            this.liveMode = false;
            this.stopPolling();
        }
    }

    onDateRangeChange(change: LogDateRangeChange) {
        this.stopPolling();
        this.includesToday = change.includesToday;
        if (!this.includesToday) this.liveMode = false;

        const params: any = change.useExactDate
            ? { date: change.date }
            : { startDate: change.startDate, endDate: change.endDate };

        this.loading = true;
        this.content = '';
        this.resetNotice = false;
        this.logService.getLogHistory(params).subscribe(
            (resp: any) => {
                this.content = resp?.content || '';
                this.offset = resp?.offset || 0;
                this.loading = false;
                this.scrollToBottom();
                // Only tail the live file when the selected range actually reaches today
                if (this.liveMode && this.includesToday) this.startPolling();
            },
            (err) => {
                this.alertService.addError(err);
                this.loading = false;
            }
        );
    }

    // Read-only polling by byte offset: never sends anything back to the server beyond file/offset
    private startPolling() {
        this.stopPolling();
        this.pollSubscription = timer(POLL_INTERVAL_MS, POLL_INTERVAL_MS).pipe(
            switchMap(() => this.logService.getLogTail(this.file, this.offset))
        ).subscribe(
            (resp: any) => {
                // Only follow new content if the user hasn't scrolled up to read something older
                const shouldStickToBottom = this.isNearBottom();
                if (resp?.reset) {
                    // File was rotated/truncated since the last poll: the buffer no longer matches the server
                    this.content = resp?.content || '';
                    this.resetNotice = true;
                } else if (resp?.content) {
                    this.content += resp.content;
                }
                this.offset = resp?.offset ?? this.offset;
                if (shouldStickToBottom) this.scrollToBottom();
            },
            (err) => {
                this.alertService.addError(err);
                this.liveMode = false;
                this.stopPolling();
            }
        );
    }

    private stopPolling() {
        if (this.pollSubscription) {
            this.pollSubscription.unsubscribe();
            this.pollSubscription = null;
        }
    }

    private isNearBottom(): boolean {
        const el = this.consoleOutput?.nativeElement;
        if (!el) return true;
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        return distanceFromBottom < 60;
    }

    private scrollToBottom() {
        // Wait for the DOM update to actually render/layout before measuring scrollHeight
        setTimeout(() => {
            requestAnimationFrame(() => {
                const el = this.consoleOutput?.nativeElement;
                if (el) el.scrollTop = el.scrollHeight;
            });
        });
    }
}
