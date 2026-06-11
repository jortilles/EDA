import { ViewChild, Component, OnInit, Output, EventEmitter, Input, signal } from '@angular/core';
import { UploadFileService } from '@eda/services/utils/upload-file.service';
import { AlertService } from '@eda/services/service.index';
import { ProgressBarModule } from 'primeng/progressbar';
import { IconComponent } from '@eda/shared/components/icon/icon.component';


@Component({
  standalone: true,
  selector: 'app-uploadFile',
  templateUrl: './upload-file.component.html',
  styleUrls: ['./upload-file.component.css'],
  imports: [ProgressBarModule, IconComponent]
})
export class UploadFileComponent implements OnInit {

  @ViewChild('file', { static: false }) file: { nativeElement: { files: { [key: string]: File; }; value: string; click: () => void; }; };
  @Output() onFileSaved = new EventEmitter<string>();
  @Input() route : string;

  public files: Set<File> = new Set();
  public isDraggingGeoJsonFile = signal<boolean>(false);
  public _geoJsonFile = signal<File | null>(null);
  public _geoJsonFileName = signal<string>('');
  constructor(
    public uploadService: UploadFileService,
    public alertService: AlertService) { }

  ngOnInit() { }

  public  progressValue = 0;
  public  canBeClosed = false;
  public uploading = false;
  public uploadSuccessful = false;
  public currentFile : any;
  public loadedfile : any;

  onFilesAdded() {
    this.files = new Set();
    const files: { [key: string]: File } = this.file.nativeElement.files;
    let fileFormat = files[0].name.split('.'); // splits into an array of name and format
    const modifiedFiles: { [key: string]: File } = {}; // copy of files with name and type changed

    // Check if the file is a json or geojson; if neither, return an error
    if(fileFormat[1] === 'json' || fileFormat[1] === 'geojson'){
      for (const key in files) {
        if (files.hasOwnProperty(key)) {
          const originalFile = files[key];
      
          // Create a new file with a new name and type
          const newFile = new File(
            [originalFile], // Original file content
            `${fileFormat[0]}.json`, // New name to assign
            {
              type: 'application/json', // New MIME type to assign
              lastModified: originalFile.lastModified, // Keep the modification date
            }
          );

          // Assign the new file to the modified object
          modifiedFiles[key] = newFile;
        }
      }
    
      for (let key in modifiedFiles) {
        if (!isNaN(parseInt(key))) {
          this.files.add(modifiedFiles[key]);
        }
      }
      this.loadedfile = modifiedFiles[0];
      const fileReader = new FileReader();
      fileReader.readAsText(this.loadedfile, "UTF-8");
      fileReader.onload = () => {
        this.canBeClosed = true;
      }
      fileReader.onerror = (error) => {
        console.log(error);
      }
    }
    else this.alertService.addError($localize`:@@IncorrectFile:Archivo incorrecto, verifique que el formato del archivo sea json o geojson.`);
  }


  async uploadFile() {
    this.uploadService.upload(this.loadedfile, this.route).subscribe(
      data => {
      this.currentFile = data;
      this.onFileSaved.emit('foo');
    },
    error => { console.log('file uploading error: ', error);});
  }


  // Methods to handle drag & drop events
  handleDrag(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  handleDragIn(e: DragEvent, type: 'geojson' | 'json') {
    e.preventDefault();
    e.stopPropagation();
    this.isDraggingGeoJsonFile.set(true);
  }

  handleDragOut(e: DragEvent, type: 'geojson') {
    e.preventDefault();
    e.stopPropagation();
    this.isDraggingGeoJsonFile.set(false);
  }

  handleDrop(e: DragEvent, type: 'geojson') {
    e.preventDefault();
    e.stopPropagation();

    this.isDraggingGeoJsonFile.set(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
    }
  }

  handleFileSelect(e: Event, type: 'geojson' | 'json') {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.handleFiles(files[0], type);
    }
  }

  handleFiles(file: File, type: 'geojson' | 'json') {
    this._geoJsonFileName.set(file.name);
    this._geoJsonFile.set(file);
  }


  handleModelImport() {
    if (!this._geoJsonFile()) {
      this.alertService.addError($localize`:@@selectFileImport:Por favor selecciona un archivo para importar`)
      return;
    }

    // Read the file and verify if it is valid
    const fileReader = new FileReader();
    fileReader.onload = () => {
      const geojson = JSON.parse(fileReader.result as string);

      // Validate that the file is a GeoJSON with features of type Polygon or MultiPolygon
      const allSupported = geojson?.features?.every((f: any) => ['Polygon', 'MultiPolygon'].includes(f.geometry?.type));
      const isValid = geojson?.type === 'FeatureCollection' && geojson?.features?.length > 0 && allSupported;

      if (isValid) {
        this.alertService.addSuccess($localize`:@@correctGeoJsonFormat:El archivo tiene un formato GeoJson válido.`)
        this.onFilesAdded();
        this.uploadFile();
      } else {
        const unsupportedType = geojson?.features?.find((f: any) => !['Polygon', 'MultiPolygon'].includes(f.geometry?.type))?.geometry?.type;
        const reason = unsupportedType
          ? $localize`:@@unsupportedGeoJsonType:El tipo de geometría "${unsupportedType}" no está admitido. Solo se admiten "Polygon" y "MultiPolygon".`
          : $localize`:@@wrongGeoJsonFormat:El archivo no tiene un formato GeoJson válido.`;
        this.alertService.addError(reason);
        this._geoJsonFileName.set('');
        this._geoJsonFile.set(null);
      }
    };
    fileReader.readAsText(this._geoJsonFile());
  }
}