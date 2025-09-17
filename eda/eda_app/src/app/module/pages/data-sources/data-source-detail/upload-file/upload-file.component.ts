import { ViewChild, Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { UploadFileService } from '@eda/services/utils/upload-file.service';
import { AlertService } from '@eda/services/service.index';



@Component({
  selector: 'app-uploadFile',
  templateUrl: './upload-fle.component.html',
  styleUrls: ['./upload-file.component.css']
})
export class UploadFileComponent implements OnInit {

  @ViewChild('file', { static: false }) file: { nativeElement: { files: { [key: string]: File; }; value: string; click: () => void; }; };
  @Output() onFileSaved = new EventEmitter<string>();
  @Input() route : string;

  public files: Set<File> = new Set();

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
  public progressBar : Boolean = false;

  onFilesAdded() {
    this.files = new Set();
    const files: { [key: string]: File } = this.file.nativeElement.files;
    let fileFormat = files[0].name.split('.'); // separa en un arreglo nombre y formato
    const modifiedFiles: { [key: string]: File } = {}; // copia de files con name y type cambiados

    // Verificación si el archivo es un json o un geojson, si no es ninguno de los dos nos devolvera error
    if(fileFormat[1] === 'json' || fileFormat[1] === 'geojson'){
      for (const key in files) {
        if (files.hasOwnProperty(key)) {
          const originalFile = files[key];
      
          // Crear un nuevo archivo con un nuevo nombre y tipo
          const newFile = new File(
            [originalFile], // El contenido original del archivo
            `${fileFormat[0]}.json`, // El nuevo nombre que quieras asignar
            {
              type: 'application/json', // El nuevo tipo MIME que quieras asignar
              lastModified: originalFile.lastModified, // Mantener la fecha de modificación
            }
          );
      
          // Asignar el nuevo archivo al objeto modificado
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

  addFile() {
    this.file.nativeElement.value = "";
    this.file.nativeElement.click();
  }

  async uploadFile() {
    this.progressBar = true;
    this.uploadService.upload(this.loadedfile, this.route).subscribe(
      data => {
      this.currentFile = data;
      this.onFileSaved.emit('foo');
      this.progressBar = false;
    },
    error => { console.log('file uploading error: ', error); this.progressBar = false});
  }
}