import { Component, OnInit } from '@angular/core';

// Servicio
import { UserService } from '@eda/services/service.index';

@Component({
  selector: 'app-logs',
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.css']
})
export class LogsComponent implements OnInit {

  protected logs_file = '';
  protected logs_error_file = '';

  logFileBoolean: boolean = false;
  logErrorFileBoolean: boolean = false;


  constructor(private userService: UserService,) { }

  ngOnInit(): void {
  }

  logsFile() {

    // Aca agrego el servicio para mostrar los logs. 
    this.userService.getLogFile().subscribe((resp: any) => {
        console.log('data:  ',resp.content);
        this.logs_file = resp.content.replace(/(?:\r\n|\r|\n)/g, '<br>');
        this.logErrorFileBoolean = false;
        this.logFileBoolean = true;
    }, (err) => console.log(err));
  }

  logsErrorFile() {
    // Aca agrego el servicio para mostrar los logs de error. 
    this.userService.getLogErrorFile().subscribe((resp: any) => {
      console.log('data:  ',resp.content);
      this.logs_error_file = resp.content.replace(/(?:\r\n|\r|\n)/g, '<br>');
      this.logFileBoolean = false;
      this.logErrorFileBoolean = true;
    }, (err) => console.log(err));
  }

}
