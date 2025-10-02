import { Component, OnInit, inject, signal} from '@angular/core';

// Servicio
import { LogService } from '@eda/services/service.index';

@Component({
  standalone: true,
  selector: 'app-logs',
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.css']
})
export class LogsComponent implements OnInit {
  private logService = inject(LogService);

  protected logs_file = '';
  protected logs_error_file = '';

  logFileBoolean: boolean = false;
  logErrorFileBoolean: boolean = false;
  

  constructor() { }

  ngOnInit(): void {
  }

  logsFile() {
    console.log('logs file')
    
    // Aca agrego el servicio para mostrar los logs. 
    this.logService.getLogFile().subscribe((resp: any) => {
      console.log('data:  ',resp.content);
      this.logs_file = resp.content.replace(/(?:\r\n|\r|\n)/g, '<br>');
        this.logErrorFileBoolean = false;
        this.logFileBoolean = true;
      }, (err) => console.log(err));
    }
    
    logsErrorFile() {
    console.log('logs file error')
    // Aca agrego el servicio para mostrar los logs de error. 
    this.logService.getLogErrorFile().subscribe((resp: any) => {
      console.log('data:  ',resp.content);
      this.logs_error_file = resp.content.replace(/(?:\r\n|\r|\n)/g, '<br>');
      this.logFileBoolean = false;
      this.logErrorFileBoolean = true;
    }, (err) => console.log(err));
  }

}