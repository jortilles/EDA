import { FormGroup, ReactiveFormsModule, FormControl, Validators, FormsModule } from '@angular/forms';
import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { DataSourceService } from '@eda/services/service.index';
import { SelectItem } from 'primeng/api';
import { UploadFileComponent } from '../upload-file/upload-file.component';
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";
import { CommonModule } from '@angular/common';
@Component({
  standalone: true,
  selector: 'app-map-dialog',
  templateUrl: './maps-dialog.component.html',
  imports: [EdaDialog2Component, CommonModule, ReactiveFormsModule, FormsModule, UploadFileComponent]
})

export class MapDialogComponent implements OnInit {
  public display: boolean = false;
  @Output() close: EventEmitter<any> = new EventEmitter<any>();

  public title = $localize`:@@addMap:Mapas`;

  @ViewChild('fileUploader', { static: false }) fileUploader: UploadFileComponent;

  public fields: SelectItem[];
  public tables: SelectItem[];
  public columns: SelectItem[];
  public columnsValues: any;
  public linkedColumns: any[] = [];
  public serverMaps: any[] = [];
  public center: any[];
  
  activeTab = "properties"
  selectedMap = "customers - Country"

  public mapForm = new FormGroup({
    mapName: new FormControl("", Validators.required),
    latitude: new FormControl(""),
    longitude: new FormControl(""),
    dataModelField: new FormControl(""),
    selectedTable: new FormControl(""),
    selectedColumn: new FormControl(""),
  })

  constructor(private dataSourceService: DataSourceService) {
    this.mapForm.get('selectedTable')!.valueChanges.subscribe(valor => {
      this.getColumns(valor);
    });
  }

  ngOnInit(): void {
    this.display = true;
    this.serverMaps = this.dataSourceService.getMaps() || [];
    this.tables = this.dataSourceService.getModel().map(table => ({ label: table.display_name.default, value: table.table_name })).sort();
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab
  }

  fileLoaded() {
    const geoJson = this.fileUploader.currentFile.file;
    this.fields = Object.keys(geoJson.features[0].properties).sort().map(key => { return { label: key, value: key } });
    let bs = geoJson.features.map(f => {
      let type = f.geometry.type;
      if (type === 'MultiPolygon') {
        return [
          f.geometry.coordinates[0][0].map(cord => cord[0]),
          f.geometry.coordinates[0][0].map(cord => cord[1])

        ]
      } else {
        return [
          f.geometry.coordinates[0].map(cord => cord[0]),
          f.geometry.coordinates[0].map(cord => cord[1])

        ]
      }

    });

    let bounds = bs.reduce((a, b) => [[].concat.apply(a[0], b[0]), [].concat.apply(a[1], b[1])]);
    let minX = bounds[0].reduce((min, v) => min >= v ? v : min, Infinity);
    let minY = bounds[1].reduce((min, v) => min >= v ? v : min, Infinity);
    let maxX = bounds[0].reduce((max, v) => max >= v ? max : v, -Infinity);
    let maxY = bounds[1].reduce((max, v) => max >= v ? max : v, -Infinity);
    let centerX = minX + ((maxX - minX) / 2);
    let centerY = minY + ((maxY - minY) / 2);
    this.center = [centerX, centerY];
  }

  getColumns(selectedTable: string) {

    if (selectedTable) {
      const match = this.dataSourceService.getModel().filter(table => table.table_name.toLowerCase() === selectedTable.toLowerCase());

      if (match.length > 0) {
        this.columns = match[0].columns
          .map(col => ({ label: col.display_name.default, value: JSON.stringify({ table: selectedTable, col: col } ) }));
          this.columns.sort((a, b) => a.label.localeCompare(b.label));
          this.columnsValues = match[0].columns;
      }
    }
  }

  pushItem() {
    const selectedColumn = this.columnsValues.find(columnas => columnas.display_name.default === this.mapForm.value.selectedColumn);
    if (selectedColumn) {
      this.linkedColumns.push({table: this.mapForm.value.selectedTable, col: selectedColumn});
    }
  }

  saveMap() {
    let newMap = false;
    //If map uploaded push to current maps (loaded - eventualy deleted + new)
    if (this.fileUploader.currentFile && this.mapForm.value.dataModelField && this.mapForm.value) {
      newMap = true;
      this.serverMaps.push(
        {
          mapID: this.fileUploader.currentFile.file._id,
          field: this.mapForm.value.dataModelField,
          name: this.mapForm.value.mapName ? this.mapForm.value.mapName : '-',
          center: this.center,
          linkedColumns: this.linkedColumns
        });
    }
    this.onClose(
      {
        mapID: this.fileUploader.currentFile ? this.fileUploader.currentFile.file._id : null,
        newMap: newMap ? true : false,
        linkedColumns: this.linkedColumns,
        serverMaps: this.serverMaps
      });
  }

  removeMap(map: any) {
    this.serverMaps = this.serverMaps.filter(m => m.mapID !== map.mapID);
  }

  deleteLink(link) {
    this.linkedColumns = this.linkedColumns.filter(col => col.col.column_name !== link.col.column_name);
  }

  closeDialog() {
    this.onClose();
  }


  onClose(response?: any): void {
    this.display = false;
    this.close.emit(response);
  }

}