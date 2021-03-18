import { AlertService } from './../../../services/alerts/alert.service';
import { MailService } from './../../../services/api/mail.service';
import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { SpinnerService } from '@eda/services/service.index';

@Component({
  selector: 'mail-management',
  templateUrl: './mail-management.component.html',

})
export class MailManagementComponent implements OnInit {

  public header: string = $localize`:@@mailmanagementHeader:Gestión de correo`;
  public form: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private mailService: MailService,
    private alertService: AlertService,
    private spinnerService: SpinnerService,) {

      this.form = this.formBuilder.group({
        host: [null, Validators.required],
        port: [null, Validators.required],
        secure: [false, Validators.required],
        user: [null, Validators.required],
        password: [null, Validators.required],
      })

  }
  ngOnInit(): void {

    this.mailService.getConfiguration().subscribe(
      res => {
        const response: any = res;
        this.form = this.formBuilder.group({
          host: [response.config.host, Validators.required],
          port: [response.config.port, Validators.required],
          secure: [response.config.secure, Validators.required],
          user: [response.config.auth.user, Validators.required],
          password: [null, Validators.required],
        })
      },
      err => {

      }
    )

  }

  public sendMailconfig() {

    const options = this.getOptions();
    this.spinnerService.on();
    this.mailService.saveConfiguration(options).subscribe(
      res => {
        this.spinnerService.off();
        this.alertService.addSuccess( $localize`:@@mailConfSaved:Configuración guardada correctamente`);
      },
      err => {
        this.spinnerService.off();
        this.alertService.addError(err)
      }
    );

  }

  public checkCredentials() {
    this.spinnerService.on();
    const options = this.getOptions();

    this.mailService.checkConfiguration(options).subscribe(
      res => {
        this.spinnerService.off();
        this.alertService.addSuccess($localize`:@@mailConfOk:Credenciales  correctas`);
      },
      err => {
        this.spinnerService.off();
        this.alertService.addError(err)
      }
    );

  }

  public getOptions() {
    const options = {
      host: this.form.value.host,
      port: this.form.value.port,
      secure: this.form.value.secure,
      auth: { user: this.form.value.user, pass: this.form.value.password },
      tls: { rejectUnauthorized: this.form.value.secure ? true : false }
    }
    return options;
  }

}