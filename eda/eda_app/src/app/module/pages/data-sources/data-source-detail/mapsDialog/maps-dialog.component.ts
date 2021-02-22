import { FormGroup, FormBuilder } from '@angular/forms';
import { Component, OnInit, ViewChild } from '@angular/core';
import { EdaDialogAbstract, EdaDialogCloseEvent, EdaDialog } from '@eda/shared/components/shared-components.index';
import { MapUtilsService, DataSourceService } from '@eda/services/service.index';
import { SelectItem } from 'primeng/api';
import { UploadFileComponent } from '../upload-file/upload-file.component';

@Component({
  selector: 'app-map-dialog',
  templateUrl: './maps-dialog.component.html',
  styleUrls: ['./maps-dialog.component.css']
})

export class MapDialogComponent extends EdaDialogAbstract implements OnInit {

  @ViewChild('fileUploader', { static: false }) fileUploader: UploadFileComponent;

  public dialog: EdaDialog;
  public form: FormGroup;
  public fields: SelectItem[];
  public selectedField: string;
  public tables: SelectItem[];
  public selectedTable: SelectItem;
  public columns: SelectItem[];
  public selectedColumn: SelectItem;
  public linkedColumns: Array<any> = [];
  public serverMaps: Array<any> = [];
  public center: Array<number>;
  // public selectedMap : string;

  constructor(
    private formBuilder: FormBuilder,
    private dataSourceService: DataSourceService) {
    super();
    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: ''
    });
    this.dialog.style= {width: '85%', height: '85%', top: '93px', left: '205px'};

    this.form = this.formBuilder.group({
      mapURL: [null],
      selectedField: [null],
      mapName: [null],
      x: [null],
      y: [null]
    });
  }

  ngOnInit(): void {
    this.serverMaps = this.dataSourceService.getMaps() || [];
  }

  fileLoaded() {
    const geoJson = this.fileUploader.currentFile.file;
    this.fields = Object.keys(geoJson.features[0].properties).sort().map(key => { return { label: key, value: key } });
    let bs = geoJson.features.map(f => {
      let type = f.geometry.type;
      if (type === 'MultiPolygon') {
       return  [
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

  getColumns() {
    if (this.selectedTable) {
      this.columns = this.dataSourceService.getModel().filter(table => table.table_name === this.selectedTable.value)[0].columns
        .map(col => ({ label: col.display_name.default, value: { table: this.selectedTable.value, col: col } }));
    }
  }
  pushItem() {
    if (this.selectedColumn) {
      this.linkedColumns.push(this.selectedColumn.value);
    }
  }
  saveMap() {
    let newMap = false;
    //If map uploaded push to current maps (loaded - eventualy deleted + new)
    if (this.fileUploader.currentFile && this.form.value.selectedField && this.form.value) {
      newMap = true;
      this.serverMaps.push(
        {
          mapID: this.fileUploader.currentFile.file._id,
          field: this.form.value.selectedField.value,
          name: this.form.value.mapName,
          center: this.center
        });
    }
    this.onClose(EdaDialogCloseEvent.NEW,
      {
        mapID: this.fileUploader.currentFile ? this.fileUploader.currentFile.file._id : null,
        newMap: newMap ? true : false,
        linkedColumns: this.linkedColumns,
        serverMaps: this.serverMaps
      });
  }
  deleteMap(map: any) {
    this.serverMaps = this.serverMaps.filter(m => m.mapID !== map.mapID);
  }
  deleteLink(link) {
    this.linkedColumns = this.linkedColumns.filter(col => col.col.column_name !== link.col.column_name);
  }
  closeDialog() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }
  onShow(): void {
    this.dialog.title = $localize`:@@MapDatamodel:Mapas`;
    this.tables = this.dataSourceService.getModel().map(table => ({ label: table.display_name.default, value: table.table_name })).sort();

  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

}