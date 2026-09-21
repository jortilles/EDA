export type TreeTableSortOrder = 'none' | 'asc' | 'desc';

export class TreeTableConfig {
  editedTreeTable: Boolean;
  hierarchyLabels: Array<string>;
  leafLabels: Array<string>;
  showOriginField: boolean = false;
  showColumnFilters: boolean = true;
  showChildCount: boolean = false;
  sortOrder: TreeTableSortOrder = 'none';
  sortColumn: string = '';
  columnWidths?: Record<string, string>;
  constructor(editedTreeTable: boolean, hierarchyLabels: Array<string>, leafLabels: Array<string>) {
    this.editedTreeTable = editedTreeTable;
    this.hierarchyLabels = hierarchyLabels;
    this.leafLabels = leafLabels;
  }
}
