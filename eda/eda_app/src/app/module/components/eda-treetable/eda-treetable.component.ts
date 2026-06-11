import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common'; // Required for directives
import * as _ from 'lodash';

// Modules for the Treetable
import { TreeNode } from 'primeng/api';
import { TreeTableModule } from 'primeng/treetable';

interface Column {
  field: string;
  header: string;
}

import { FATHER_ID } from './../../../config/personalitzacio/customizables'

@Component({
  selector: 'app-eda-treetable',
  templateUrl: './eda-treetable.component.html',
  styleUrls: ['./eda-treetable.component.css'],
  standalone: true, // A Standalone component indicates that it does not need to be declared in the modules
  imports: [CommonModule, TreeTableModule],
})
export class EdaTreeTable implements OnInit {

  @Input() inject: any; // inject contains two arrays => (labels and values)
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();

  files!: TreeNode[];
  labels: any[] = [];
  labelsInputs: any[] = [];
  filterMode = 'lenient'; // Lenient mode activated, activate buttons for mode options => lenient/strict
  public lodash: any = _;

  id_label: string = '';

  public filterBy: string = $localize`:@@filterByTreetable:Filtro: `;

  // For the dynamic tree table
  dynamicFiles!: TreeNode[];
  dynamicCols!: Column[];
  isDynamic: Boolean = false; // Ask if dynamic table is used

  nodes: TreeNode[] = [];
  leafs: { field: string; header: string }[] = [];
  showField: boolean = false;

  constructor() { }

  ngOnInit(): void {
    // Input data error handling control
    this.showField = this.inject.config.config.showOriginField || false;
    if (!this.inject || !Array.isArray(this.inject.query) || !Array.isArray(this.inject.data?.values)) {
      console.error('Inject structure incorrecta. Esperado inject.query[] y inject.data.values[]');
      return;
    }

    const col1 = this.inject.query[0];
    const col2 = this.inject.query[1];

    if (col1.column_type === 'numeric' && col2.column_type === 'numeric') {
      this.isDynamic = false;
      this.prepareColumns();
      this.nodes = this.buildTree();
    } else {
      this.isDynamic = true;
      this.initDynamicTreeTable()
    }
  }

  // Extract the query and get the visible columns
  // Only fields after the IDs will be displayed
  prepareColumns() {
    // I extract columns after the IDs
    this.leafs = this.inject.query.slice(2).map(c => ({
      field: c?.name ?? c?.display_name?.default ?? '',
      header: c?.display_name?.default ?? c?.name ?? ''
    }));

  }

  // EXPL hierarchy construction ==>
  /*
  // NODE MAP
  // First we create a map that iterates over all rows coming from the query.
  // Here we store the item ID, its values, and its empty children []

  // ROOTS
  // Second we create the treeNode that we will return. It has the same structure as
  // FiltrosDependientes: roots -> data with children, inside children -> data with children...

  // There are two cases:
  // 1) when the first ID is shared with the parent
  // 2) when it is not
  */
  buildTree(): TreeNode[] {
    const values: any[][] = this.inject.data.values; // All rows [ParentID, ItemID, valueN, ...]
    const nodesMap: Record<string, TreeNode> = {}; // Node map by ID.

    // Iterate over all values and store all nodes to display without IDs
    values.forEach(row => {
      const dataObj: Record<string, any> = {};
      // Store in dataObj the fields to display in the table
      this.inject.query.slice(2).forEach((queryField, idx) => {
        const field = queryField?.name ?? queryField?.display_name?.default ?? '';
        dataObj[field] = row[idx + 2]; // +2 because IDs are ALWAYS at the beginning
      });

      const key = String(row[1]); // ItemID
      nodesMap[key] = { key, data: dataObj, children: [] };
    });

    // Root is the table structure:
    const root: TreeNode[] = [];
    let  rootFound:boolean = false;
    // Shape and link the node list to build the treeNode
    Object.values(nodesMap).forEach(node => {
      const id = node.key;

      // Find the row for this node in queryvalue and get the ParentID
      const parentKey = values.find(r => String(r[1]) === id)?.[0];
      const parentString = parentKey.toString();

      if (parentKey === FATHER_ID && !rootFound) { // its parent is 0 or none ==> root
        root.push(node);
        rootFound = true;
      } else if (parentString && nodesMap[parentString]) { // has a parent and is in the list ==> child
        nodesMap[parentKey].children.push(node);
      } else { /* has a parent but is not in the list ==> orphan */}
    });
    return root;
  }

  initDynamicTreeTable() {

    let data: any;
    let labelsDisplay = this.inject.query.map((c: any) => c.display_name.default);

    data = {
      labels: labelsDisplay,
      values: this.inject.data.values,
    }

    this.dynamicFiles = this.buildDynamicHierarchyTreetable(data);
  }


  buildDynamicHierarchyTreetable(data: { labels: string[], values: any[][] }) {

    const { labels, values } = data;

    // Convert rows into array of objects
    const rows = values.map(row => {
      const obj: { [key: string]: any } = {};
      labels.forEach((label, i) => {
        obj[label] = row[i];
      });
      return obj;
    });

    // We determine unique ones for each label
    const isUniqueLabel: { [key: string]: boolean } = {};
    labels.forEach(label => {
      const seen = new Set();
      rows.forEach(row => seen.add(row[label]));
      isUniqueLabel[label] = seen.size === rows.length;
    });

    // Grouping levels (non-unique labels in order)
    let hierarchyLabels = labels.filter(label => !isUniqueLabel[label]);

    // Leaf level: use only unique labels
    let leafLabels = labels.filter(label => isUniqueLabel[label]);


    // Visualization control of the element of the treeTable
    // -----------------------------------------------------
    if (hierarchyLabels.length !== 0 && leafLabels.length === 0) {
      leafLabels.push(hierarchyLabels[hierarchyLabels.length - 1]);
      hierarchyLabels.pop();
    }

    if (leafLabels.length !== 0 && hierarchyLabels.length === 0) {
      hierarchyLabels.push(leafLabels[leafLabels.length - 1]);
      leafLabels.pop();
    }
    // -----------------------------------------------------

    if (this.inject.config.config.editedTreeTable) {
      hierarchyLabels = this.inject.config.config.hierarchyLabels;
      leafLabels = this.inject.config.config.leafLabels;
    } else {
      this.inject.config.config.hierarchyLabels = hierarchyLabels;
      this.inject.config.config.leafLabels = leafLabels;
    }


    // Label information with unique value columns
    this.dynamicCols = leafLabels.map(item => {
      return { field: item.toLowerCase(), header: item }
    })

    // Recursive tree builder
    function buildLevel(entries: any[], level: number): any[] {
      if (level >= hierarchyLabels.length) {
        return entries.map(entry => {
          const leaf: any = {};
          leafLabels.forEach(label => {
            leaf[label.toLowerCase()] = entry[label];
          });
          return { data: leaf };
        });
      }

      const currentLabel = hierarchyLabels[level];
      const grouped: { [key: string]: any[] } = {};

      for (const entry of entries) {
        const key = entry[currentLabel];
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(entry);
      }

      return Object.keys(grouped).map(groupValue => ({
        data: {
          [leafLabels[0]?.toLowerCase()]: `<b>${currentLabel}</b>: ${groupValue}`
        },
        children: buildLevel(grouped[groupValue], level + 1)
      }));
    }

    return buildLevel(rows, 0);
  }

  handleClick(item: any, colname: string) {
    if (this.inject.linkedDashboardProps && this.inject.linkedDashboardProps.sourceCol === colname) {
      const props = this.inject.linkedDashboardProps;
      const url = window.location.href.substr(0, window.location.href.indexOf('/dashboard')) + `/dashboard/${props.dashboardID}?${props.table}.${props.col}=${item}`;
      window.open(url, "_blank");
    } else {
      const indexFilterBy = this.inject.data.values.find(row => row.includes(item));
      const filterBy = indexFilterBy ? this.inject.data.labels[indexFilterBy.indexOf(item)] : null;
      let label = item;
      this.onClick.emit({ label, filterBy });
    }
  }

}
