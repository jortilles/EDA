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
    // Here I add the service to display logs.
    this.logService.getLogFile().subscribe((resp: any) => {
      this.logs_file = resp.content.replace(/(?:\r\n|\r|\n)/g, '<br>');
        this.logErrorFileBoolean = false;
        this.logFileBoolean = true;
      }, (err) => console.log(err));
    }
    
    logsErrorFile() {
    // Here I add the service to display error logs.
    this.logService.getLogErrorFile().subscribe((resp: any) => {
      this.logs_error_file = resp.content.replace(/(?:\r\n|\r|\n)/g, '<br>');
      this.logFileBoolean = false;
      this.logErrorFileBoolean = true;
    }, (err) => console.log(err));
  }

}