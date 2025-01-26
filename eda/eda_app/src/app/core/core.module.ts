import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

// Modules
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { PrimengModule } from './primeng.module';
import { NgChartsModule } from 'ng2-charts';

@NgModule({
    imports: [
        CommonModule,
        FormsModule
    ],
    exports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        HttpClientModule,
        NgChartsModule,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})

export class CoreModule {}
