import { AlertService } from '@eda/services/service.index';
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormsModule} from '@angular/forms';
import { DataSourceService } from '@eda/services/service.index';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';

interface TagOption {
  label: string;
  value: number;
}

@Component({
  standalone: true,
  selector: 'app-add-tag-dialog',
  templateUrl: './add-tag.component.html',
  styleUrls: ['./add-tag.component.css'],
  imports: [MultiSelectModule, ButtonModule, TableModule, FormsModule, EdaDialog2Component]
})

export class AddTagComponent implements OnInit {
  @Input() model_id: string;
  @Input() tagArray: any[] = [];
  @Output() close: EventEmitter<any> = new EventEmitter<any>();

  public display: boolean = false;
  
  public newTag: string = '';
  public tags: TagOption[] = [];
  public allDsTags: string[];
  public selectedTags: any[] = [];

  public emptyString: string;
  public existentString: string;
  public emptyMessageTags: string;

  constructor(
    public dataSourceService: DataSourceService,
    private fb: FormBuilder,
    private alertService: AlertService
  ) {
    this.emptyString = $localize`:@@emptyTag:Este tag esta vacío`;
    this.existentString = $localize`:@@existentTag:Este tag ya existe`;
    this.emptyMessageTags = $localize`:@@emptyMessageTags:No se encontraron resultados`;
    this.dataSourceService.getTags()
  }


  ngOnInit(): void {
    this.display = true;
    this.load();
  }

  load(): void {
    this.dataSourceService.currentTags.subscribe((response) => {

      const distinctTags: any = [...new Set(response)];

      this.tags = this.tagsArrayToOptions(distinctTags);
      let selectedFilteredTags = [];

      if (this.tagArray) {
        selectedFilteredTags = this.tagsArrayToOptions(this.tagArray).map(parameterTag => {
          return this.tags.find(tag => tag.label === parameterTag.label)
        }).filter(tag => tag !== undefined);
      }

      this.selectedTags = [...selectedFilteredTags.map(option => option.value)];
    });
  }


  closeDialog() {
    this.close.emit();
  }


  addItem() {
    // Declare the new tag as a string, trimming whitespace
    const newTagLabel: string = this.newTag.trim();

    // If empty or already exists, do not add it
    if (newTagLabel === "") { this.alertService.addWarning(this.emptyString); return; }
    if (this.tagExists(newTagLabel)) { this.alertService.addWarning(this.existentString); return; }

    // Create the object and push it into the options
    const newTagOption: TagOption = { label: newTagLabel, value: this.tags.length };
    this.tags.push(newTagOption);

    // Also add it to the selected tags variable
    let updatedTagIndexes = this.selectedTags;
    this.selectedTags = [...updatedTagIndexes, newTagOption.value];
    this.newTag = '';
  }


  private tagExists(newTagLabel: string): boolean {
    return this.tags.some(tag => tag.label === newTagLabel)
  }

  saveTags() {
    // Save tags directly from the selector as a string array
    this.close.emit(this.tagsToStringArray(this.selectedTags));
  }

  // Transform from string array to options
  private tagsArrayToOptions(tagArray: string[]): TagOption[] {
    return tagArray.map((tag, index) => {
      return { label: tag, value: index };
    });
  }

  // Transform from number array to string array
  private tagsToStringArray(tagIndexes: number[]): string[] {
    return this.tags
      .filter(tag => tagIndexes.includes(tag.value) && tag.label)
      .map(tag => tag.label);
  }

}