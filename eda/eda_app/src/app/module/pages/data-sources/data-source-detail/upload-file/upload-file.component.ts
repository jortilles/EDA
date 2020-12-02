import { ViewChild, Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { UploadFileService } from '@eda/services/utils/upload-file.service';



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

  constructor(public uploadService: UploadFileService) { }

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
    for (let key in files) {
      if (!isNaN(parseInt(key))) {
        this.files.add(files[key]);
      }
    }
    this.loadedfile = files[0];
    const fileReader = new FileReader();
    fileReader.readAsText(this.loadedfile, "UTF-8");
    fileReader.onload = () => {
      this.canBeClosed = true;
    }
    fileReader.onerror = (error) => {
      console.log(error);
    }
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