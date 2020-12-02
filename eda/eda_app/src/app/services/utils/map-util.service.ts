import { LinkedDashboardProps } from './../../module/components/eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api.service';
import { shareReplay } from 'rxjs/operators';
import { LatLngExpression } from 'leaflet';

@Injectable({ providedIn: 'root' })

export class MapUtilsService extends ApiService {
    private route = '/global/upload/addFile';
    private mapsObservables$: {} = {};

    constructor(protected http: HttpClient) {
        super(http);
    }
    initShapes(mapID: string): void {
        if (!this.mapsObservables$[mapID]) {
            this.mapsObservables$[mapID] = this.get(`${this.route}/${mapID}`).pipe(
                shareReplay(1)
            );
        }
    }
    getShapes(mapID: string): Observable<any> {
        return this.mapsObservables$[mapID];
    }

    makeMarkers = (map: L.Map, data: Array<any>, labels: Array<any>, linkedDashboardProps : LinkedDashboardProps): void => {

        const maxValue = Math.max(...data.map(x => x[3]), 0);

        for (const d of data) {
            const radius = typeof d[3] === 'number' ? MapUtilsService.scaledRadius(d[3], maxValue) : 20;
            const color = this.getColor(radius);

            const lat = parseFloat(d[0]);// / 1000000 / 2;
            const lon = parseFloat(d[1]); // / 10000;
            const properties = {
                weight: 1,
                radius: radius,
                color: 'white',
                fillColor: color,
                fillOpacity: 0.8
            }
            if (lat && lon) {
                const circle = L.circleMarker([lon, lat] as LatLngExpression, properties);
                circle.bindPopup(this.makePopup(d, labels), { 'className': 'custom', autoPan: false });
                circle.on('mouseover', function (e) {
                    this.openPopup();
                });
                circle.on('mouseout', function (e) {
                    this.closePopup();
                });
                circle.on('click', ()=> { this.linkDashboard(d[2], linkedDashboardProps)})
                circle.addTo(map);
            }

        }

    }

    private linkDashboard = (value, linkedDashboard:LinkedDashboardProps) => {
        if (linkedDashboard) {
            const props = linkedDashboard;
            const url = window.location.href.substr( 0, window.location.href.indexOf('/dashboard')) + `/dashboard/${props.dashboardID}?${props.table}.${props.col}=${value}`
            window.open(url, "_blank");
          }
    }

    private makePopup = (data: any, labels: Array<string>): string => {
        let div = '';
        for (let i = 2; i < 4; i++) {
            if (data[i] !== undefined) {
                div += `<div> ${labels[i]} :  ${data[i]} </div>`;
            }
        }
        return `` + div;
    }
    public makeGeoJsonPopup = (layer_id: string, data: Array<number>, labels: Array<string>, labelIndex: number): string => {

        let row = data.filter(row => row[labelIndex] !== null && row[labelIndex].toUpperCase().replace(/\s/g, '') === layer_id.toUpperCase().replace(/\s/g, ''))[0];
        let div = '';
        for (let i = 0; i < labels.length; i++) {
            if (row !== undefined) {
                let value = typeof row[i] === 'number' ? parseFloat(row[i]).toLocaleString('de-DE') : row[i];
                div += `<div> ${labels[i]} :  ${value} </div>`;
            } else {
                div = `<div> No data </div>`;
            }
        }
        return `` + div;
    }

    private getColor = (value: number) => {
        const colors = ["#FA0F25", "#F92321", "#F8371D", "#F84B19", "#F75F15", "#F67411", "#F6880D", "#F59C09", "#F4B005", "#F4C501"];
        return colors[Math.floor(25 / value) % 10];
    }

    static scaledRadius = (val: number, maxVal: number): number => {
        return 20 * (val / maxVal) + 5;
    }



}