import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ElementRef, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common'; // Required for directives
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as _ from 'lodash';

// Modules for the Treetable
import { TreeNode } from 'primeng/api';
import { TreeTableModule } from 'primeng/treetable';

interface Column {
  field: string;
  header: string;
}

import { FATHER_ID } from '../../../config/customizable/customizable_default'

@Component({
  selector: 'app-eda-treetable',
  templateUrl: './eda-treetable.component.html',
  styleUrls: ['./eda-treetable.component.css'],
  standalone: true, // A Standalone component indicates that it does not need to be declared in the modules
  imports: [CommonModule, TreeTableModule],
})
export class EdaTreeTable implements OnInit, OnDestroy {

  private static readonly MIN_COL_WIDTH_PCT = 5;
  private static readonly BASE_TABLE_STYLE = { 'min-width': '50rem' };
  private static readonly FIXED_TABLE_STYLE = { 'min-width': '50rem', 'width': '100%', 'table-layout': 'fixed' };

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
  leafs: { field: string; header: string; isHtml?: boolean }[] = [];
  showField: boolean = false;
  showColumnFilters: boolean = true;
  showChildCount: boolean = false;

  columnWidths: Record<string, string> = {};
  tableStyle: Record<string, string> = EdaTreeTable.BASE_TABLE_STYLE;
  private resizeDrag: {
    leftField: string;
    rightField: string;
    startX: number;
    leftStartPx: number;
    rightStartPx: number;
    containerWidthPx: number;
    colEls: HTMLElement[];
  } | null = null;
  private resizeMoveListener = (event: MouseEvent) => this.onColResizeMove(event);
  private resizeUpListener = () => this.onColResizeEnd();

  constructor(private sanitizer: DomSanitizer, private host: ElementRef, private ngZone: NgZone,
    private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    // Input data error handling control
    const cfg = this.inject.config.config;
    this.showField = cfg.showOriginField || false;
    this.showColumnFilters = cfg.showColumnFilters ?? true;
    this.showChildCount = cfg.showChildCount ?? false;
    if (!this.inject || !Array.isArray(this.inject.query) || !Array.isArray(this.inject.data?.values)) {
      console.error('Inject structure incorrecta. Esperado inject.query[] y inject.data.values[]');
      return;
    }

    const col1 = this.inject.query[0];
    const col2 = this.inject.query[1];

    if (col1.column_type === 'numeric' && col2.column_type === 'numeric') {
      this.isDynamic = false;
      this.prepareColumns();
      this.applyColumnWidths(cfg.columnWidths);
      this.nodes = this.buildTree();
      this.sortNodes(this.nodes, this.leafs.map(l => l.field));
    } else {
      this.isDynamic = true;
      this.initDynamicTreeTable();
      this.sortNodes(this.dynamicFiles, this.dynamicCols.map(c => c.field));
    }
  }

  // Extract the query and get the visible columns
  // Only fields after the IDs will be displayed
  prepareColumns() {
    // I extract columns after the IDs
    this.leafs = this.inject.query.slice(2).map(c => ({
      field: c?.name ?? c?.display_name?.default ?? '',
      header: c?.display_name?.default ?? c?.name ?? '',
      isHtml: c?.column_type === 'html'
    }));

  }

  // Saved widths are ignored unless they cover every visible column (e.g. the query changed)
  private applyColumnWidths(widths: Record<string, string>) {
    if (widths && this.leafs.length && this.leafs.every(l => widths[l.field])) {
      this.columnWidths = widths;
      this.tableStyle = EdaTreeTable.FIXED_TABLE_STYLE;
    }
  }

  isResizeActive(col: { field: string }): boolean {
    return this.resizeDrag?.leftField === col.field;
  }

  private colEls(): HTMLElement[] {
    // The header and body tables each render their own <colgroup>
    return Array.from(this.host.nativeElement.querySelectorAll('col[data-field]'));
  }

  onColResizeStart(event: MouseEvent, col: { field: string }): void {
    event.preventDefault();
    event.stopPropagation();

    const idx = this.leafs.findIndex(l => l.field === col.field);
    const rightCol = this.leafs[idx + 1];
    if (!rightCol) return;

    const ths: HTMLElement[] = Array.from(this.host.nativeElement.querySelectorAll('th[data-field]'));
    const widthsPx: Record<string, number> = {};
    let containerWidthPx = 0;
    this.leafs.forEach(l => {
      const th = ths.find(t => t.dataset['field'] === l.field);
      widthsPx[l.field] = th?.getBoundingClientRect().width || 0;
      containerWidthPx += widthsPx[l.field];
    });
    if (!containerWidthPx) return;

    // Pin every column to its current pixel width so dragging only trades width between two neighbours
    const colEls = this.colEls();
    colEls.forEach(c => { c.style.width = widthsPx[c.dataset['field']] + 'px'; });
    this.tableStyle = EdaTreeTable.FIXED_TABLE_STYLE;

    this.resizeDrag = {
      leftField: col.field,
      rightField: rightCol.field,
      startX: event.clientX,
      leftStartPx: widthsPx[col.field],
      rightStartPx: widthsPx[rightCol.field],
      containerWidthPx,
      colEls,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('mousemove', this.resizeMoveListener);
      document.addEventListener('mouseup', this.resizeUpListener);
    });
  }

  private onColResizeMove(event: MouseEvent): void {
    const drag = this.resizeDrag;
    if (!drag) return;

    const minWidthPx = EdaTreeTable.MIN_COL_WIDTH_PCT / 100 * drag.containerWidthPx;
    const deltaPx = Math.max(minWidthPx - drag.leftStartPx,
      Math.min(drag.rightStartPx - minWidthPx, event.clientX - drag.startX));

    drag.colEls.forEach(c => {
      if (c.dataset['field'] === drag.leftField) c.style.width = (drag.leftStartPx + deltaPx) + 'px';
      if (c.dataset['field'] === drag.rightField) c.style.width = (drag.rightStartPx - deltaPx) + 'px';
    });
  }

  private onColResizeEnd(): void {
    this.removeResizeListeners();
    const drag = this.resizeDrag;
    if (!drag) return;
    this.resizeDrag = null;

    this.ngZone.run(() => {
      const pxByField: Record<string, number> = {};
      drag.colEls.forEach(c => { pxByField[c.dataset['field']] = parseFloat(c.style.width) || 0; });

      // Last column absorbs the rounding remainder so the sum is always exactly 100%
      const widths: Record<string, string> = {};
      let sumPct = 0;
      this.leafs.forEach((l, i) => {
        if (i === this.leafs.length - 1) {
          widths[l.field] = (100 - sumPct).toFixed(2) + '%';
        } else {
          const pct = parseFloat((pxByField[l.field] / drag.containerWidthPx * 100).toFixed(2));
          widths[l.field] = pct + '%';
          sumPct += pct;
        }
      });
      this.columnWidths = widths;
      this.inject.config.config.columnWidths = widths;
      this.cdr.markForCheck();
    });
  }

  private removeResizeListeners() {
    document.removeEventListener('mousemove', this.resizeMoveListener);
    document.removeEventListener('mouseup', this.resizeUpListener);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  ngOnDestroy(): void {
    this.removeResizeListeners();
  }

  // Sorts siblings at every level by the configured column.
  // `fields` is the set of valid column keys for the current mode (leafs for the static
  // father/child-ID tree, dynamicCols for the auto-detected hierarchy) since both share this
  // node shape ({data, children}) but expose different field names.
  private sortNodes(nodes: TreeNode[], fields: string[]) {
    const { sortOrder, sortColumn } = this.inject.config.config;
    if (!sortOrder || sortOrder === 'none') return;

    const field = fields.includes(sortColumn) ? sortColumn : fields[0];
    if (!field) return;

    const dir = sortOrder === 'desc' ? -1 : 1;
    const compare = (a: any, b: any): number => {
      if (typeof a === 'number' && typeof b === 'number') return a - b;
      return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' });
    };
    const sortLevel = (level: TreeNode[]) => {
      level.sort((a, b) => dir * compare(a.data[field], b.data[field]));
      level.forEach(n => sortLevel(n.children));
    };
    sortLevel(nodes);
  }

  getSafeHtml(html: string): SafeHtml {
    return html ? this.sanitizer.bypassSecurityTrustHtml(html) : '';
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
    // A Map keeps the query row order; a plain object would reorder numeric-like keys by ID
    const nodesMap = new Map<string, { node: TreeNode, parentString: string }>();

    // Iterate over all values and store all nodes to display without IDs
    values.forEach(row => {
      const dataObj: Record<string, any> = {};
      // Store in dataObj the fields to display in the table
      this.inject.query.slice(2).forEach((queryField, idx) => {
        const field = queryField?.name ?? queryField?.display_name?.default ?? '';
        dataObj[field] = row[idx + 2]; // +2 because IDs are ALWAYS at the beginning
      });

      const key = String(row[1]); // ItemID
      // parentKey may arrive as a string (e.g. cached/DECIMAL values), so compare as strings
      nodesMap.set(key, { node: { key, data: dataObj, children: [] }, parentString: String(row[0]) });
    });

    // Root is the table structure:
    const root: TreeNode[] = [];
    // Shape and link the node list to build the treeNode
    nodesMap.forEach(({ node, parentString }) => {
      if (parentString === String(FATHER_ID)) { // its parent is FATHER_ID ==> root
        root.push(node);
      } else if (nodesMap.has(parentString)) { // has a parent and is in the list ==> child
        nodesMap.get(parentString).node.children.push(node);
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
    if (typeof item === 'string' && item.trim().startsWith('<')) return;
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
