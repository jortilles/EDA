import { AlertService } from '../../../../../services/alerts/alert.service';
import { SpinnerService } from '../../../../../services/shared/spinner.service';
import { SelectItem } from 'primeng/api';
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { EdaDialogAbstract, EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { NgxCsvParser } from 'ngx-csv-parser';
import { AddTableService } from '@eda/services/api/createTable.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataSourceService, SidebarService } from '@eda/services/service.index';
import { debug, error } from 'console';
import { tree } from 'd3';
import { resolve } from 'path';

interface TagOption {
  label:string;
  value:number;
}

@Component({
  selector: 'app-add-tag-dialog',
  templateUrl: './add-tag.component.html',
  styleUrls: ['./add-tag.component.css']
})

export class AddTagComponent extends EdaDialogAbstract implements OnInit, OnDestroy {
  public dialog: EdaDialog;
  private model_id: string;
  public newTag:string = '';
  public groupForm: FormGroup;
  public tags:TagOption[] = [];
  public allDsTags:string[];
  public emptyString:string;
  public existentString:string;
  constructor(
    public dataSourceService: DataSourceService,
    private fb: FormBuilder,
    private alertService: AlertService
  ) {
    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@addTagDataSource:Añadir Tag`
    });
    this.dialog.style = { width: '60%', height: "55%",top:'-10em', left:'1em'};
    this.emptyString = $localize`:@@emptyTag:Este tag esta vacío`;
    this.existentString = $localize`:@@existentTag:Este tag ya existe`;
    this.dataSourceService.getTags()

    this.groupForm = this.fb.group({
      selectedTags: ["", Validators.nullValidator],
    });
    
  }
  onShow(): void {
    this.model_id = this.controller.params.model_id;
   
    this.dataSourceService.currentTags.subscribe((response) => {
    
      const distinctTags:any =  [...new Set(response)];
        
      this.tags = this.tagsArrayToOptions(distinctTags);
      let selectedFilteredTags = [];
      if(this.controller.params.tagArray){
         selectedFilteredTags = this.tagsArrayToOptions(this.controller.params.tagArray).map( parameterTag =>{
        return this.tags.find(tag => tag.label === parameterTag.label )
      }).filter(tag => tag !== undefined);
      }
      
      

      this.groupForm.get('selectedTags').setValue([...selectedFilteredTags.map(option => option.value)]);
    }
  )
    
  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  closeDialog() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  
  addItem() {
      //Declaramos el new tag como string, quitando los espacios vacíos
      const newTagLabel: string = this.newTag.trim(); 
      
      //Si está vacío o ya existe no lo ponemos...
      if (newTagLabel === ""){ this.alertService.addWarning(this.emptyString); return;}
      if( this.tagExists(newTagLabel)){ this.alertService.addWarning(this.existentString); return;}
      
      //Creamos el objeto y lo pusheamos en las opciones
      const newTagOption: TagOption = { label: newTagLabel, value: this.tags.length }; 
      this.tags.push(newTagOption);
      
      //En la variable de los seleccionados también
      let updatedTagIndexes = this.groupForm.get('selectedTags').value
      this.groupForm.get('selectedTags').setValue([...updatedTagIndexes,newTagOption.value]);
      this.newTag = ''; 
  }

  
  private tagExists(newTagLabel: string): boolean {
    return this.tags.some(tag => tag.label === newTagLabel) 
  }

  saveTags(){
    //Guardar los tags directamente del selector como array de strings
    const selectedTags =  [...this.groupForm.get('selectedTags').value]
    this.onClose(EdaDialogCloseEvent.NEW, this.tagsToStringArray(selectedTags));
  }
  //Transformar de string array a opciones 
  private tagsArrayToOptions(tagArray:string[]):TagOption[]{
    return tagArray.map((tag, index) => {
      return { label: tag, value: index };
    });
  }
    //Transformar de number array a string array 
  private tagsToStringArray(tagIndexes: number[]): string[] {
    return this.tags
      .filter(tag => tagIndexes.includes(tag.value) && tag.label)
      .map(tag => tag.label);
  }
  ngOnInit():void {
   
  }
  ngOnDestroy(): void {
    
  }


  
 
}