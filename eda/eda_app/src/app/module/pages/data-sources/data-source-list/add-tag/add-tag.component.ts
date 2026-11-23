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
  value: string;
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
      const remoteTags = this.tagsArrayToOptions(distinctTags);

      // currentTags is a BehaviorSubject: this fires once immediately with the stale/empty
      // value and again once getTags()'s HTTP call resolves. Merge instead of overwriting so a
      // tag added locally (via addItem) between those two emissions isn't lost.
      this.tags = Array.from(new Map([...remoteTags, ...this.tags].map(tag => [tag.label, tag])).values());

      if (this.tagArray) {
        const preselectedTags = this.tagsArrayToOptions(this.tagArray)
          .map(parameterTag => this.tags.find(tag => tag.label === parameterTag.label))
          .filter(tag => tag !== undefined)
          .map(option => option.value);

        this.selectedTags = Array.from(new Set([...this.selectedTags, ...preselectedTags]));
      }
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
    const newTagOption: TagOption = { label: newTagLabel, value: newTagLabel };
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
    return tagArray.map((tag) => {
      return { label: tag, value: tag };
    });
  }

  // Transform from selected values back to a string array
  private tagsToStringArray(tagValues: string[]): string[] {
    return this.tags
      .filter(tag => tagValues.includes(tag.value) && tag.label)
      .map(tag => tag.label);
  }

}