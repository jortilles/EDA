import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common'; // Necesario para las directivas
import * as _ from 'lodash';

// Modules for the Treetable
import { TreeNode } from 'primeng/api';
import { TreeTableModule  } from 'primeng/treetable';

// Custom constant
import { FATHER_ID } from './../../../config/personalitzacio/customizables'

interface Column {
    field: string;
    header: string;
}

@Component({
  selector: 'app-eda-treetable',
  templateUrl: './eda-treetable.component.html',
  styleUrls: ['./eda-treetable.component.css'],
  standalone: true, // A Standalone component indicates that it does not need to be declared in the modules
  imports: [CommonModule, TreeTableModule],
})
export class EdaTreeTable implements OnInit {

  @Input() inject: any; // El inject contiene dos arreglos => (labels y values)
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

  constructor() { }

  ngOnInit(): void {
    const col1 = this.inject.query[0];
    const col2 = this.inject.query[1];

    if(col1.column_type === 'numeric' && col2.column_type === 'numeric') {
      this.isDynamic = false;
      this.initBasicTreeTable()
    } else {
      this.isDynamic = true;
      this.initDynamicTreeTable()
    }

  }

  initBasicTreeTable() {
    // Collecting title tags for the Treetable
    this.inject.query.slice(2).forEach((e: any) => {
      this.labels.push(e.display_name.default)
    })

    this.inject.query.forEach((e: any) => {
      this.labelsInputs.push(e.display_name.default)
    })


    // Getting the first label of the labels as a generic id
    this.id_label = this.labelsInputs[0];

    // Building the object needed for the Treetable
    this.buildHierarchyTreetable(this.labelsInputs, this.inject.data.values).then( (files: any) => {
      this.files = files;
    } )
  }

  // Function that provides sorting logic
  buildHierarchyTreetable(labels: string[], values: any[]) {
    const map: { [key: number]: any } = {};

    // First, build the node map
    values.forEach(item => {
        const node: { [key: string]: any } = {}; // Create a node with dynamic keys

        // Dynamically assign properties using labels
        labels.forEach((label, index) => {
            node[label] = item[index]; // We assign the values of `values` to the properties defined by `labels`
        });

        // Store the node in the map using the ID as the key
        map[node[`${this.id_label}`]] = { 
            data: node,  // The `data` object is dynamic, it contains the properties of the node
            children: []  // We initialize the empty children list
        };
    });

    // Now, build the hierarchy by assigning children to their parents.
    const result: any[] = [];

    values.forEach(item => {
        const currentItem = map[item[0]]; // Current node
        const parentId = item[1]; // Father ID

        // Root node starts with FATHER_ID (constant value 0)
        if (parentId === FATHER_ID) {
            result.push(currentItem);
        } else if (map[parentId]) {
            map[parentId].children.push(currentItem); // Add father
        }
    });

    return Promise.resolve(result); // Promise sent to expect large amount of data
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
    if(hierarchyLabels.length!==0 && leafLabels.length===0) {
      leafLabels.push(hierarchyLabels[hierarchyLabels.length-1]);
      hierarchyLabels.pop();
    }

    if(leafLabels.length!==0 && hierarchyLabels.length===0) {
      hierarchyLabels.push(leafLabels[leafLabels.length-1]);
      leafLabels.pop();
    }
    // -----------------------------------------------------

    if(this.inject.config.config.editedTreeTable) {
      hierarchyLabels = this.inject.config.config.hierarchyLabels;
      leafLabels = this.inject.config.config.leafLabels;
    } else {
      this.inject.config.config.hierarchyLabels = hierarchyLabels;
      this.inject.config.config.leafLabels = leafLabels;
    }


    // Label information with unique value columns
    this.dynamicCols = leafLabels.map(item => {
        return { field: item.toLowerCase(), header: item}
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
      this.onClick.emit({label, filterBy});
    }
}

}
