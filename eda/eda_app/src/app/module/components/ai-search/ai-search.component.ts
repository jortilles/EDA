import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TabViewModule } from 'primeng/tabview';
import { ChipModule } from 'primeng/chip';
import { NlToSqlService, NlToSqlOptions, NlToSqlResult, QueryObjectResult, DirectSqlResult, HybridResult } from '@eda/services/api/nl-to-sql.service';
import { lastValueFrom } from 'rxjs';

export interface AiSearchResult {
    result: NlToSqlResult;
    naturalLanguage: string;
}

export interface AiSearchApplyEvent {
    queryObject?: QueryObjectResult;
    directSql?: DirectSqlResult;
    mode: 'update-current' | 'create-new';
}

@Component({
    selector: 'ai-search',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputTextareaModule,
        DropdownModule,
        ProgressSpinnerModule,
        TabViewModule,
        ChipModule
    ],
    templateUrl: './ai-search.component.html',
    styleUrls: ['./ai-search.component.css']
})
export class AiSearchComponent implements OnInit {

    private nlToSqlService = inject(NlToSqlService);

    @Input() dataSource: any;
    @Input() dataSourceId: string;
    @Input() mode: 'hybrid' | 'query-object' | 'direct' = 'hybrid';
    @Input() available: boolean = false;
    @Input() hasPanels: boolean = false;

    @Output() resultReady = new EventEmitter<AiSearchResult>();
    @Output() applyQuery = new EventEmitter<AiSearchApplyEvent>();
    @Output() availabilityChange = new EventEmitter<boolean>();

    naturalLanguage: string = '';
    isLoading: boolean = false;
    errorMessage: string = '';
    lastResult: AiSearchResult | null = null;

    modeOptions: any[] = [
        { label: '混合模式 (推荐)', value: 'hybrid' },
        { label: '查询对象模式', value: 'query-object' },
        { label: '直接 SQL 模式', value: 'direct' }
    ];
    selectedMode: 'hybrid' | 'query-object' | 'direct' = 'hybrid';

    activeTab: number = 0;
    copied: boolean = false;

    ngOnInit(): void {
        this.selectedMode = this.mode;
        this.checkAvailability();
    }

    async checkAvailability(): Promise<void> {
        try {
            const resp = await lastValueFrom(this.nlToSqlService.available());
            this.available = resp.response.available;
            this.availabilityChange.emit(this.available);
        } catch (error) {
            console.error('Error checking AI availability:', error);
            this.available = false;
            this.availabilityChange.emit(false);
        }
    }

    async search(): Promise<void> {
        if (!this.naturalLanguage.trim() || !this.dataSourceId) {
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';
        this.lastResult = null;

        try {
            const options: NlToSqlOptions = {
                mode: this.selectedMode,
                include_explanation: true,
                validate_sql: true
            };

            const resp = await lastValueFrom(
                this.nlToSqlService.generateSqlWithDataSource(
                    this.naturalLanguage,
                    this.dataSourceId,
                    options
                )
            );

            if (resp.ok) {
                this.lastResult = {
                    result: resp.response,
                    naturalLanguage: this.naturalLanguage
                };
                this.resultReady.emit(this.lastResult);
                this.activeTab = 0;
            } else {
                this.errorMessage = '生成 SQL 失败，请重试。';
            }
        } catch (error: any) {
            console.error('Error in AI search:', error);
            this.errorMessage = error.message || '发生错误，请重试。';
        } finally {
            this.isLoading = false;
        }
    }

    onKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.search();
        }
    }

    isQueryObjectResult(result: NlToSqlResult): result is QueryObjectResult {
        return result.mode === 'query-object';
    }

    isDirectSqlResult(result: NlToSqlResult): result is DirectSqlResult {
        return result.mode === 'direct';
    }

    isHybridResult(result: NlToSqlResult): result is HybridResult {
        return result.mode === 'hybrid';
    }

    applyToCurrentPanel(): void {
        if (!this.lastResult) return;

        const event: AiSearchApplyEvent = {
            mode: 'update-current'
        };

        if (this.isHybridResult(this.lastResult.result)) {
            if (this.lastResult.result.recommended === 'query-object') {
                event.queryObject = this.lastResult.result.query_object;
            } else {
                event.directSql = this.lastResult.result.direct_sql;
            }
        } else if (this.isQueryObjectResult(this.lastResult.result)) {
            event.queryObject = this.lastResult.result;
        } else if (this.isDirectSqlResult(this.lastResult.result)) {
            event.directSql = this.lastResult.result;
        }

        this.applyQuery.emit(event);
    }

    createNewPanel(): void {
        if (!this.lastResult) return;

        const event: AiSearchApplyEvent = {
            mode: 'create-new'
        };

        if (this.isHybridResult(this.lastResult.result)) {
            if (this.lastResult.result.recommended === 'query-object') {
                event.queryObject = this.lastResult.result.query_object;
            } else {
                event.directSql = this.lastResult.result.direct_sql;
            }
        } else if (this.isQueryObjectResult(this.lastResult.result)) {
            event.queryObject = this.lastResult.result;
        } else if (this.isDirectSqlResult(this.lastResult.result)) {
            event.directSql = this.lastResult.result;
        }

        this.applyQuery.emit(event);
    }

    clear(): void {
        this.naturalLanguage = '';
        this.lastResult = null;
        this.errorMessage = '';
        this.activeTab = 0;
        this.copied = false;
    }

    copySql(): void {
        let sqlText = '';
        if (this.lastResult) {
            if (this.isHybridResult(this.lastResult.result)) {
                sqlText = this.lastResult.result.direct_sql?.sql || '';
            } else if (this.isDirectSqlResult(this.lastResult.result)) {
                sqlText = this.lastResult.result.sql;
            }
        }

        if (sqlText) {
            navigator.clipboard.writeText(sqlText).then(() => {
                this.copied = true;
                setTimeout(() => {
                    this.copied = false;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy:', err);
            });
        }
    }

    useHint(hint: string): void {
        this.naturalLanguage = hint;
    }
}
