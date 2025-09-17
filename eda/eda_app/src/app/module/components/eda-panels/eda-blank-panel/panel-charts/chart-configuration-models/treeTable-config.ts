export class TreeTableConfig {
  editedTreeTable: Boolean;
  hierarchyLabels: Array<string>;
  leafLabels: Array<string>;
  constructor(editedTreeTable: boolean, hierarchyLabels: Array<string>, leafLabels: Array<string>) {
    this.editedTreeTable = editedTreeTable;
    this.hierarchyLabels = hierarchyLabels;
    this.leafLabels = leafLabels;
  }
}