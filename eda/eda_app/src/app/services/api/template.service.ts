import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
    providedIn: 'root'
})
export class TemplateService extends ApiService {

    private route = '/template/';

    public _templateCenterOpen = new BehaviorSubject<boolean>(false);
    public templateCenterOpen = this._templateCenterOpen.asObservable();

    public _selectedTemplate = new BehaviorSubject<any>(null);
    public selectedTemplate = this._selectedTemplate.asObservable();

    getTemplates(params?: { search?: string; sortBy?: string; sortOrder?: string; dataSourceId?: string }): Observable<any> {
        if (params) {
            return this.getParams(this.route, params);
        }
        return this.get(this.route);
    }

    getTemplate(id: string): Observable<any> {
        return this.get(`${this.route}${id}`);
    }

    createTemplateFromDashboard(dashboardId: string, name: string, description?: string, isPublic?: boolean): Observable<any> {
        return this.post(`${this.route}from-dashboard`, {
            dashboardId,
            name,
            description,
            isPublic
        });
    }

    createTemplateFromConfig(config: any): Observable<any> {
        return this.post(this.route, config);
    }

    updateTemplate(id: string, data: any): Observable<any> {
        return this.put(`${this.route}${id}`, data);
    }

    deleteTemplate(id: string): Observable<any> {
        return this.delete(`${this.route}${id}`);
    }

    createDashboardFromTemplate(templateId: string, data: { name: string; visible?: string; group?: any[] }): Observable<any> {
        return this.post(`${this.route}${templateId}/create-dashboard`, data);
    }

    updateTemplateUsage(id: string): Observable<any> {
        return this.put(`${this.route}${id}/use`, {});
    }

    openTemplateCenter(): void {
        this._templateCenterOpen.next(true);
    }

    closeTemplateCenter(): void {
        this._templateCenterOpen.next(false);
    }

    selectTemplate(template: any): void {
        this._selectedTemplate.next(template);
    }

    clearSelectedTemplate(): void {
        this._selectedTemplate.next(null);
    }
}
