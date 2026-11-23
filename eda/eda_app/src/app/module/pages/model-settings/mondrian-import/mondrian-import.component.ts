import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { AlertService, DataSourceService, SpinnerService } from '@eda/services/service.index';
import { IconComponent } from '@eda/shared/components/icon/icon.component';

interface MondrianImportResult {
  dataSourceId: string;
  summary: { cubes: number, tables: number, columns: number, relations: number };
  warnings: string[];
}

/**
 * Imports a Pentaho Mondrian 3.x schema (XML) as a new EDA datasource.
 * The schema does not include the database connection, so it is asked here.
 */
@Component({
  selector: 'app-mondrian-import',
  templateUrl: './mondrian-import.component.html',
  styleUrls: ['./mondrian-import.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent]
})
export class MondrianImportComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dataSourceService = inject(DataSourceService);
  private alertService = inject(AlertService);
  private spinnerService = inject(SpinnerService);
  private router = inject(Router);

  /** SQL databases with host/user/password connection (must match the API translator). */
  public readonly dbTypes = [
    { label: 'Postgres', value: 'postgres', port: 5432 },
    { label: 'Sql Server', value: 'sqlserver', port: 1433 },
    { label: 'MySQL', value: 'mysql', port: 3306 },
    { label: 'Vertica', value: 'vertica', port: 5433 },
    { label: 'Oracle', value: 'oracle', port: 1521 },
    { label: 'SnowFlake', value: 'snowflake', port: null },
    { label: 'ClickHouse', value: 'clickhouse', port: 8123 }
  ];

  public readonly sidOptions = [
    { label: 'SID', value: 1 },
    { label: 'SERVICE_NAME', value: 0 }
  ];

  public form: FormGroup;
  public showPassword = false;

  file = signal<File | null>(null);
  fileName = signal<string>('');
  isDragging = signal<boolean>(false);
  result = signal<MondrianImportResult | null>(null);

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [''],
      hideUnmapped: [true],
      allowCache: [true],
      type: ['postgres', Validators.required],
      host: ['', Validators.required],
      port: ['5432', Validators.required],
      database: ['', Validators.required],
      schema: [''],
      user: ['', Validators.required],
      password: ['', Validators.required],
      sid: [1],
      warehouse: [''],
      poolLimit: [null],
      ssl: [false]
    });

    this.form.get('type').valueChanges.subscribe(type => this.onTypeChange(type));
  }

  get type(): string {
    return this.form.get('type')?.value;
  }

  isInvalid(control: string): boolean {
    const ctrl = this.form.get(control);
    return !!ctrl && ctrl.invalid && ctrl.touched;
  }

  /** Sets the default port of the database type. Snowflake has no port. */
  private onTypeChange(type: string) {
    const dbType = this.dbTypes.find(t => t.value === type);
    const port = this.form.get('port');
    port.setValue(dbType?.port != null ? String(dbType.port) : '');
    port.setValidators(type === 'snowflake' ? null : Validators.required);
    port.updateValueAndValidity();
  }

  /* ---------------------------------------------------------------------------------------- */
  /* Schema file                                                                               */
  /* ---------------------------------------------------------------------------------------- */

  handleDrag(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  handleDragIn(e: DragEvent) {
    this.handleDrag(e);
    this.isDragging.set(true);
  }

  handleDragOut(e: DragEvent) {
    this.handleDrag(e);
    this.isDragging.set(false);
  }

  handleDrop(e: DragEvent) {
    this.handleDragOut(e);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) this.setFile(files[0]);
  }

  handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.setFile(input.files[0]);
      input.value = '';
    }
  }

  private setFile(file: File) {
    this.file.set(file);
    this.fileName.set(file.name);
    this.result.set(null);
  }

  /* ---------------------------------------------------------------------------------------- */
  /* Connection                                                                                */
  /* ---------------------------------------------------------------------------------------- */

  /** Connection parameters in the format expected by the API (same as the connection page). */
  private buildConnection() {
    const v = this.form.value;
    return {
      type: v.type,
      host: v.host?.trim(),
      port: v.port,
      database: v.database?.trim(),
      schema: v.schema?.trim() || null,
      user: v.user?.trim(),
      password: v.password,
      sid: v.type === 'oracle' ? v.sid : null,
      warehouse: v.type === 'snowflake' ? v.warehouse : null,
      poolLimit: v.type === 'mysql' ? v.poolLimit : null,
      ssl: ['postgres', 'mysql', 'sqlserver', 'clickhouse'].includes(v.type) ? !!v.ssl : false
    };
  }

  private isConnectionValid(): boolean {
    const controls = ['type', 'host', 'port', 'database', 'user', 'password'];
    controls.forEach(c => this.form.get(c).markAsTouched());
    if (controls.some(c => this.form.get(c).invalid)) {
      this.alertService.addError($localize`:@@IncorrectForm:Formulario incorrecto. Revise los campos obligatorios.`);
      return false;
    }
    return true;
  }

  async testConnection() {
    if (!this.isConnectionValid()) return;
    this.spinnerService.on();
    try {
      await lastValueFrom(this.dataSourceService.testConnection(this.buildConnection()));
      this.alertService.addSuccess($localize`:@@connectedWithServer:Conectado con el servidor`);
    } catch (err) {
      this.alertService.addError($localize`:@@dsConnectionRefused:No se ha podido conectar a la base de datos.`);
    } finally {
      this.spinnerService.off();
    }
  }

  /* ---------------------------------------------------------------------------------------- */
  /* Import                                                                                    */
  /* ---------------------------------------------------------------------------------------- */

  async import() {
    const file = this.file();
    if (!file) {
      this.alertService.addError($localize`:@@selectFileImport:Por favor selecciona un archivo para importar`);
      return;
    }
    if (!this.isConnectionValid()) return;

    let xml: string;
    try {
      xml = await file.text();
    } catch {
      this.alertService.addError($localize`:@@notPossibleReadFile:No se pudo leer el archivo seleccionado`);
      return;
    }
    if (!xml || !xml.includes('<Schema')) {
      this.alertService.addError($localize`:@@mondrianInvalidFile:El archivo no es un esquema de Mondrian válido`);
      return;
    }

    const v = this.form.value;
    this.spinnerService.on();
    try {
      const res: any = await lastValueFrom(this.dataSourceService.importMondrianSchema({
        xml,
        name: v.name?.trim() || undefined,
        hideUnmapped: v.hideUnmapped,
        allowCache: v.allowCache,
        connection: this.buildConnection()
      }));
      this.result.set({ dataSourceId: res.data_source_id, summary: res.summary, warnings: res.warnings || [] });
      this.file.set(null);
      this.fileName.set('');
      this.alertService.addSuccess($localize`:@@mondrianImportedSuccessfully:Esquema de Mondrian importado correctamente`);
    } catch (err) {
      this.alertService.addError(err?.text || $localize`:@@mondrianImportError:Ha ocurrido un error al importar el esquema de Mondrian`);
    } finally {
      this.spinnerService.off();
    }
  }

  openDataSource() {
    const result = this.result();
    if (result) this.router.navigate(['/data-source/', result.dataSourceId]);
  }
}
