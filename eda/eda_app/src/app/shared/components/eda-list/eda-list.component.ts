import { CommonModule } from '@angular/common';
import { Component, Input, ContentChildren, QueryList, TemplateRef, AfterContentInit, AfterViewInit, OnInit } from '@angular/core';

export interface ListColumn {
  key: string;
  title: string;
}

@Component({
  selector: 'eda-list',
  templateUrl: './eda-list.component.html',
  imports: [CommonModule],
  standalone: true,
})
export class EdaListComponent implements OnInit {
  @Input() columns: ListColumn[] = [];
  @Input() rows: any[] = [];

  @ContentChildren(TemplateRef) templates!: QueryList<TemplateRef<any>>;
  columnTemplates = new Map<string, TemplateRef<any>>();

  ngOnInit() {
    setTimeout(() => {
      console.log(this.templates);
      console.log(this.rows)
      // Mapeamos los templates usando su key
      this.columns.forEach(column => {
        const template = this.templates.find(tmpl => (tmpl as any)._declarationTContainer?.localNames.includes(column.key));
        if (template) {
          this.columnTemplates.set(column.key, template);
        }
      });
    }, 1000)
    
  }
}
