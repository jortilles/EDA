import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, } from "@angular/forms";
import { AlertService } from "@eda/services/service.index";
import { SharedModule } from "@eda/shared/shared.module";
import { MultiSelectModule } from "primeng/multiselect";
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectButtonModule } from "primeng/selectbutton";
import * as _ from 'lodash';
import { DashboardPage } from "../dashboard.page";
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";

@Component({
  selector: 'app-dashboard-tag-modal',
  standalone: true,
  templateUrl: './dashboard-tag.modal.html',
  imports: [SharedModule, ReactiveFormsModule, FormsModule, SelectButtonModule, MultiSelectModule, FloatLabelModule, EdaDialog2Component]
})

export class DashboardTagModal implements OnInit {
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Input() dashboard: DashboardPage;
  public display: boolean = false;

  public newTag: any;
  public tags: any[];
  public selectedTags: any[] = [];

  constructor(private alertService: AlertService) { }

  ngOnInit(): void {
    // Recogemos todos los tags guardados en local 
    const tags = JSON.parse(localStorage.getItem('tags')) || [];
    this.selectedTags = this.dashboard.selectedTags;
    this.tags = _.uniqBy(tags, 'value');

    // Si this tags no es una array porque son tags legacy, tenemos que convertirlo en array
    if(!Array.isArray(this.tags)){
      this.tags = [this.tags];
    }
    
    // Añadimos los tags que estan presentes en este documento, por si no estan guardados en local
    if(!Array.isArray(this.selectedTags)){
      this.selectedTags = [this.selectedTags];
    } 
  
    // Añadir valores de tag que vengan importados
    this.tags.push(...this.selectedTags.filter(  (tag): tag is string => typeof tag === "string").map(tag => ({label: tag,value: tag})));

    // Eliminar duplicados por 'label' por si sí estan guardados en local y no repetirlos
    this.tags = Array.from(new Map(this.tags.map(item => [item.label, item])).values());
  }

  public setNewTag() {
    const repeated = this.tags.some(tag => (this.newTag.toUpperCase() === String(tag.value).toUpperCase()));

    if (this.newTag.length === 0) {
      this.newTag = !this.newTag;
      this.alertService.addError($localize`:@@emptyTag:Este tag esta vacío`);
    } else if (repeated) {
      this.newTag = '';
      this.alertService.addError($localize`:@@existentTag:Este tag ya existe`);
    } else {
      const tag = JSON.parse(JSON.stringify({ label: this.newTag, value: this.newTag }));
      this.tags.push(tag);
      this.newTag = '';
      localStorage.setItem('tags', JSON.stringify(this.tags));
      this.alertService.addSuccess($localize`:@@tagCreated:Etiqueta creada correctamente`);
      (this.selectedTags ??= []).push(tag.label);
    }
  }

  public onApply() {
    this.display = false;
    this.close.emit(this.selectedTags);
    this.alertService.addSuccess($localize`:@@tagAssigned:Etiqueta asignada correctamente`);
  }

  public disableApply(): boolean {
    return false;
  }

  public onClose(): void {
    this.display = false;
    this.close.emit();
  }
}