import { LinkedDashboardProps } from './../../module/components/eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props';
import { Injectable, SecurityContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api.service';
import { shareReplay } from 'rxjs/operators';
import { LatLngExpression } from 'leaflet';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })

export class MapUtilsService extends ApiService {
    private route = '/global/upload/readGeoJsonFile';
    private mapsObservables$: {} = {};
    private coordinates: Array<Array<number>> | null = null;
    private zoom: number | null = null;


    constructor(protected http: HttpClient, private _sanitizer: DomSanitizer) {
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

    makeMarkers = (map: L.Map, data: Array<any>, labels: Array<any>, linkedDashboardProps: LinkedDashboardProps): void => {
        //Puede tener categoría o no  por lo que el set de datos es longitud, latitutd, [Categoria] , valor.
        // por eso se pone el numericValue como un valor relativo.
        const numericValue=data[0].length-1;
        const maxValue = Math.max(...data.map(x => x[numericValue]), 0);
        for (const d of data) {
            const radius = typeof d[numericValue] === 'number' ? MapUtilsService.scaledRadius(d[numericValue], maxValue) : 20;
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
                circle.on('click', () => { this.linkDashboard(d[2], linkedDashboardProps) })
                circle.addTo(map);
            }

        }

    }

    private linkDashboard = (value, linkedDashboard: LinkedDashboardProps) => {
        if (linkedDashboard) {
            const props = linkedDashboard;
            const url = window.location.href.substr(0, window.location.href.indexOf('/dashboard')) + `/dashboard/${props.dashboardID}?${props.table}.${props.col}=${value}`
            window.open(url, "_blank");
        }
    }

    private makePopup = (data: any, labels: Array<string>): string => {
        const me = this;
        let div = '';
        for (let i = 2; i < 4; i++) {
            if (data[i] !== undefined) {
                div += `<div> ${me._sanitizer.sanitize(SecurityContext.HTML, labels[i])} :  ${data[i]} </div>`;
            }
        }
        return `` + div;
    }
    // Esta función es para evitar los petes del los nulos de  row[labelIndex].toUpperCase().replace(/\s/g, '') 
    private labelProcessingHelper( val:any){
        let res = '';
        try{
            res = val.toUpperCase().replace(/\s/g, '') ;
        }catch(e){
            console.log('Error processing value... probably a null. Try to avoid them...');
            console.log(e);
            res = '';
        }
        return res;

    }

    public makeGeoJsonPopup = (layer_id: string, data: Array<number>, labels: Array<string>, labelIndex: number, totalSum:number): string => {
        const me = this;
        let row = data.filter(row => row[labelIndex] !== null &&  this.labelProcessingHelper( row[labelIndex] ) === this.labelProcessingHelper( layer_id )   )[0];
        let div = '';
        for (let i = 0; i < labels.length; i++) {
            if (row !== undefined) {
                let value =
                    typeof row[i] === 'number' ?
                        `${parseFloat(row[i]).toLocaleString('de-DE', { maximumFractionDigits: 6 })} ( ${(parseFloat(row[i]) / totalSum * 100).toFixed(2)}% )`
                        : row[i];
                div += `<div> ${me._sanitizer.sanitize(SecurityContext.HTML, labels[i])} :  ${value} </div>`;
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

    public setCoordinates(coordinates: Array<Array<number>>): void {
        this.coordinates = coordinates;
    }
    public getCoordinates(): Array<Array<number>> | null {
        return this.coordinates;
    }
    public setZoom(zoom: number): void {
        this.zoom = zoom;
    }
    public getZoom():number | null {
        return this.zoom;
    }


}