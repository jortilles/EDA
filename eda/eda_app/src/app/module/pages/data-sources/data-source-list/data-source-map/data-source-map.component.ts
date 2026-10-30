import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { PrimengModule } from 'app/core/primeng.module';
import { DataSourceService } from '@eda/services/service.index';
import * as d3 from 'd3';

interface MapColumn {
    label: string;
    technical: string;
    type: string;
    node: TreeNode;
}

interface MapTable {
    id: string;          // technical table name (table_name)
    label: string;       // display name (display_name)
    node: TreeNode;
    columns: MapColumn[];
    relationColumns: Set<string>;
    x: number;
    y: number;
}

interface SimNode extends d3.SimulationNodeDatum {
    table: MapTable;
}

interface MapLink {
    key: string;
    source: MapTable;
    target: MapTable;
    sourceColumns: string[];
    targetColumns: string[];
}

/**
 * Map view of the data model: entity-relationship diagram drawn with d3.
 * Tables are (draggable) nodes and relations are edges.
 * Selecting a table expands it to show its columns.
 */
@Component({
    standalone: true,
    selector: 'app-data-source-map',
    templateUrl: './data-source-map.component.html',
    styleUrls: ['./data-source-map.component.css'],
    imports: [PrimengModule]
})
export class DataSourceMapComponent implements AfterViewInit, OnChanges, OnDestroy {
    // Model tree (model > tables > columns) the map is drawn from
    @Input() treeData: TreeNode[] = [];
    // Node selected in the tree (model, table or column); its table is highlighted on the map
    @Input() selectedNode: TreeNode;
    // Search text: tables that do not match are dimmed
    @Input() searchTerm = '';
    // Notifies the parent that a node was selected from the map
    @Output() nodeSelected = new EventEmitter<{ node: TreeNode }>();

    // SVG canvas the map is drawn on
    @ViewChild('svgMap', { static: true }) svgMap: ElementRef<SVGSVGElement>;

    // Translatable texts for buttons and tooltips
    public fitSTR = $localize`:@@dsMapFit:Ajustar a la pantalla`;
    public relayoutSTR = $localize`:@@dsMapRelayout:Reorganizar tablas`;
    public modelPropsSTR = $localize`:@@dsMapModelProps:Propiedades del modelo`;
    public expandSTR = $localize`:@@dsMapExpand:Mostrar columnas`;
    public collapseSTR = $localize`:@@dsMapCollapse:Ocultar columnas`;

    // Model tables as drawn on the map (position, columns, tree node)
    public tables: MapTable[] = [];
    // Relations between tables, one per pair of tables and columns
    private links: MapLink[] = [];
    // Table positions by technical name. This is the model's ds.metadata.map_layout object,
    // so they are saved with the data model and restored when it is reopened.
    private positions: { [table: string]: { x: number, y: number } } = {};

    // The view is initialized: nothing can be drawn on the SVG before that
    private viewInit = false;
    // Expanded tables (technical name). Selecting a table expands it.
    private expanded = new Set<string>();
    // Selected relation (MapLink key)
    private selectedLinkKey: string = null;
    // Relation under the pointer (MapLink key)
    private hoveredLinkKey: string = null;
    // Table being dragged: its relations are highlighted even before it is selected
    private draggedTableId: string = null;
    // The selection comes from dragging a table: it is selected without expanding it
    private skipExpand = false;
    // Until the user zooms, pans the canvas or drags tables, the map fits itself to the screen
    private autoFit = true;
    // Detects canvas size changes to refit the map
    private resizeObserver: ResizeObserver;
    // Id of the pending auto-fit requestAnimationFrame (to avoid queuing several)
    private fitFrame: number;
    // d3 zoom and pan behavior on the SVG
    private zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
    // Root group the zoom transform is applied to
    private root: d3.Selection<SVGGElement, unknown, null, undefined>;
    // Relations layer (below the tables)
    private linkLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
    // Tables layer
    private nodeLayer: d3.Selection<SVGGElement, unknown, null, undefined>;

    private readonly WIDTH = 720;  // width of each table
    private readonly HEADER = 104; // height of the header with the table name
    private readonly ROW = 76;     // height of each column row
    private readonly PAD = 12;     // vertical padding of the column list
    private readonly RADIUS = 16;  // radius of the table's rounded corners
    private readonly TOGGLE = 36;  // radius of the expand / collapse button
    // Auto-fit limits (e.g. when the model has a single table)
    private readonly MAX_TABLE_RATIO = 0.7; // a table never takes more than 70% of the canvas
    private readonly TITLE_FONT = 52;       // font-size of .ds-map-title in the CSS
    private readonly MAX_TITLE_FONT = 32;   // maximum on-screen size of the table name (px)

    constructor(private dataModelService: DataSourceService) { }

    ngAfterViewInit(): void {
        this.viewInit = true;
        this.initSvg();
        this.render();
        this.scheduleAutoFit();
        // Refit when the available size changes (view switch, window resize, etc.)
        this.resizeObserver = new ResizeObserver(() => this.scheduleAutoFit());
        this.resizeObserver.observe(this.svgMap.nativeElement);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['selectedNode']) {
            this.draggedTableId = null;
            if (this.skipExpand) this.skipExpand = false;
            else this.expandSelected();
        }
        if (this.viewInit) {
            this.render();
            if (changes['treeData']) {
                this.scheduleAutoFit();
            }
        }
    }

    ngOnDestroy(): void {
        this.resizeObserver?.disconnect();
        if (this.fitFrame) cancelAnimationFrame(this.fitFrame);
        if (this.svgMap?.nativeElement) {
            d3.select(this.svgMap.nativeElement).on('.zoom', null).selectAll('*').remove();
        }
    }

    /** Shows the model properties (root node of the tree) */
    selectModel() {
        if (this.treeData?.length) {
            this.nodeSelected.emit({ node: this.treeData[0] });
        }
    }

    /** Recomputes the layout of all tables */
    relayout() {
        this.positions = {};
        this.dataModelService.setMapLayout(this.positions);
        this.render();
        this.fitToView(true);
    }

    /** Auto-fit on the next frame, once the container has its final size */
    private scheduleAutoFit() {
        if (!this.autoFit) return;
        if (this.fitFrame) cancelAnimationFrame(this.fitFrame);
        this.fitFrame = requestAnimationFrame(() => {
            this.fitFrame = null;
            if (this.autoFit) this.fitToView(false);
        });
    }

    /** Sets the zoom so that all tables are visible */
    fitToView(animate = true) {
        this.autoFit = true;
        if (!this.tables.length || !this.zoom) return;
        const svgEl = this.svgMap.nativeElement;
        const width = svgEl.clientWidth;
        const height = svgEl.clientHeight;
        if (!width || !height) return;
        const minX = d3.min(this.tables, t => t.x);
        const minY = d3.min(this.tables, t => t.y);
        const maxX = d3.max(this.tables, t => t.x + this.WIDTH);
        const maxY = d3.max(this.tables, t => t.y + this.tableHeight(t));
        const bw = Math.max(maxX - minX, 1);
        const bh = Math.max(maxY - minY, 1);
        const maxTableHeight = d3.max(this.tables, t => this.tableHeight(t));
        const scale = Math.min(
            0.9 * width / bw,
            0.9 * height / bh,
            this.MAX_TABLE_RATIO * width / this.WIDTH,
            this.MAX_TABLE_RATIO * height / maxTableHeight,
            // Column fonts are proportional to the title, so they are capped as well
            this.MAX_TITLE_FONT / this.TITLE_FONT
        );
        const transform = d3.zoomIdentity
            .translate(width / 2 - scale * (minX + bw / 2), height / 2 - scale * (minY + bh / 2))
            .scale(scale);
        const svg = d3.select(svgEl);
        if (animate) {
            svg.transition().duration(400).call(this.zoom.transform, transform);
        } else {
            svg.call(this.zoom.transform, transform);
        }
    }

    private initSvg() {
        const svg = d3.select(this.svgMap.nativeElement);
        svg.selectAll('*').remove();

        // Marker for the relation endpoints
        svg.append('defs').append('marker')
            .attr('id', 'ds-map-dot')
            .attr('viewBox', '0 0 10 10')
            .attr('refX', 5).attr('refY', 5)
            .attr('markerWidth', 6).attr('markerHeight', 6)
            .append('circle')
            .attr('cx', 5).attr('cy', 5).attr('r', 4)
            .attr('class', 'ds-map-dot');

        this.root = svg.append('g');
        this.linkLayer = this.root.append('g').attr('class', 'ds-map-links');
        this.nodeLayer = this.root.append('g').attr('class', 'ds-map-nodes');

        this.zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 3])
            .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
                // sourceEvent only exists when the zoom is triggered by the user (wheel, canvas drag)
                if (event.sourceEvent) this.autoFit = false;
                this.root.attr('transform', event.transform.toString());
            });
        svg.call(this.zoom).on('dblclick.zoom', null);
        svg.on('click', (event: MouseEvent) => {
            if (event.target === this.svgMap.nativeElement && this.selectedLinkKey) {
                this.selectedLinkKey = null;
                this.render();
            }
        });
    }

    /** Stores the moved table's position in the model layout and marks the model as unsaved */
    private saveTablePosition(t: MapTable) {
        this.positions[t.id] = { x: Math.round(t.x), y: Math.round(t.y) };
        // Drop positions of tables that no longer exist in the model
        const ids = new Set(this.tables.map(table => table.id));
        Object.keys(this.positions).filter(id => !ids.has(id)).forEach(id => delete this.positions[id]);
        this.dataModelService.setMapLayout(this.positions);
    }

    /** Builds tables and relations from the tree and the data model */
    private buildData() {
        this.positions = this.dataModelService.getMapLayout();

        const model: any[] = this.dataModelService.getModel() ?? [];
        const tableNodes: TreeNode[] = this.treeData?.[0]?.children ?? [];
        const byLabel = new Map<string, any>();
        model.forEach(t => byLabel.set(t.display_name?.default ?? t.table_name, t));

        const tables: MapTable[] = [];
        tableNodes.forEach(node => {
            const table = byLabel.get(node.label);
            if (!table) return;
            const columnsByLabel = new Map<string, any>();
            (table.columns ?? []).forEach(c => columnsByLabel.set(c.display_name?.default ?? c.column_name, c));
            const columns: MapColumn[] = (node.children ?? []).map(colNode => {
                const col = columnsByLabel.get(colNode.label);
                return {
                    label: colNode.label,
                    technical: col?.column_name ?? colNode.label,
                    type: col?.computed_column === 'computed' ? 'calc' : (col?.column_type ?? ''),
                    node: colNode
                };
            });
            const pos = this.positions[table.table_name];
            tables.push({
                id: table.table_name,
                label: node.label,
                node,
                columns,
                relationColumns: new Set<string>(),
                x: pos?.x ?? NaN,
                y: pos?.y ?? NaN
            });
        });

        const byId = new Map<string, MapTable>();
        tables.forEach(t => byId.set(t.id, t));

        // Relations are stored in both tables: remove duplicates
        const links = new Map<string, MapLink>();
        model.forEach(table => {
            (table.relations ?? []).filter(r => r.visible !== false).forEach(r => {
                const source = byId.get(r.source_table);
                const target = byId.get(r.target_table);
                if (!source || !target) return;
                const sourceColumns: string[] = [].concat(r.source_column ?? []);
                const targetColumns: string[] = [].concat(r.target_column ?? []);
                const a = `${r.source_table}.${sourceColumns.join(',')}`;
                const b = `${r.target_table}.${targetColumns.join(',')}`;
                const key = [a, b].sort().join('|');
                sourceColumns.forEach(c => source.relationColumns.add(c));
                targetColumns.forEach(c => target.relationColumns.add(c));
                if (!links.has(key)) {
                    links.set(key, { key, source, target, sourceColumns, targetColumns });
                }
            });
        });

        this.tables = tables;
        this.links = Array.from(links.values());
    }

    /** Places tables without a position yet using a force simulation */
    private layoutMissing() {
        const pending = this.tables.filter(t => isNaN(t.x) || isNaN(t.y));
        if (!pending.length) return;

        const svgEl = this.svgMap.nativeElement;
        const width = svgEl.clientWidth || 800;
        const height = svgEl.clientHeight || 600;
        const half = this.WIDTH / 2;

        const simNodes: SimNode[] = this.tables.map(t => {
            const placed = !isNaN(t.x) && !isNaN(t.y);
            return {
                table: t,
                x: placed ? t.x + half : width / 2 + (Math.random() - 0.5) * 50,
                y: placed ? t.y + this.HEADER / 2 : height / 2 + (Math.random() - 0.5) * 50,
                // Tables already placed do not move
                fx: placed ? t.x + half : undefined,
                fy: placed ? t.y + this.HEADER / 2 : undefined
            };
        });
        const simById = new Map<string, SimNode>(simNodes.map(n => [n.table.id, n]));
        const simLinks = this.links
            .filter(l => l.source !== l.target)
            .map(l => ({ source: simById.get(l.source.id), target: simById.get(l.target.id) } as d3.SimulationLinkDatum<SimNode>));

        const simulation = d3.forceSimulation(simNodes)
            .force('link', d3.forceLink<SimNode, d3.SimulationLinkDatum<SimNode>>(simLinks).distance(this.WIDTH + 100).strength(0.6))
            .force('charge', d3.forceManyBody().strength(-1200))
            .force('collide', d3.forceCollide(this.WIDTH * 0.55))
            .force('x', d3.forceX(width / 2).strength(0.05))
            .force('y', d3.forceY(height / 2).strength(0.05))
            .stop();
        for (let i = 0; i < 300; i++) simulation.tick();

        simNodes.forEach(n => {
            n.table.x = Math.round(n.x - half);
            n.table.y = Math.round(n.y - this.HEADER / 2);
            this.positions[n.table.id] = { x: n.table.x, y: n.table.y };
        });
    }

    private render() {
        if (!this.root) return;
        this.buildData();
        this.layoutMissing();
        this.drawLinks();
        this.drawTables();
        this.updateLinks();
    }

    private selectedTableLabel(): string {
        const node = this.selectedNode;
        if (!node) return null;
        if (node.data === 'tabla') return node.label;
        if (node.data === 'columna') return node.parent?.label ?? null;
        return null;
    }

    private isExpanded(t: MapTable): boolean {
        return this.expanded.has(t.id);
    }

    private isSelected(t: MapTable): boolean {
        return this.selectedTableLabel() === t.label;
    }

    /** Expands the selected table (or the table of the selected column) */
    private expandSelected() {
        const label = this.selectedTableLabel();
        if (!label) return;
        const table = (this.dataModelService.getModel() ?? []).find(t => (t.display_name?.default ?? t.table_name) === label);
        if (table) this.expanded.add(table.table_name);
    }

    /** Header button: expands (and selects) or collapses the table */
    private toggleTable(t: MapTable) {
        if (this.isExpanded(t)) {
            this.expanded.delete(t.id);
            this.render();
        } else {
            this.expanded.add(t.id);
            this.nodeSelected.emit({ node: t.node });
            this.render();
        }
    }

    /** The column is part of the selected relation or of the one under the pointer */
    private isRelatedColumn(t: MapTable, c: MapColumn): boolean {
        return this.links
            .filter(l => l.key === this.selectedLinkKey || l.key === this.hoveredLinkKey)
            .some(link => (link.source.id === t.id && link.sourceColumns.includes(c.technical))
                || (link.target.id === t.id && link.targetColumns.includes(c.technical)));
    }

    /** Updates the related-column highlight without redrawing the tables */
    private updateRelatedColumns() {
        const self = this;
        this.nodeLayer.selectAll<SVGGElement, MapTable>('g.ds-map-table').each(function (t) {
            d3.select(this).selectAll<SVGGElement, MapColumn>('g.ds-map-column')
                .classed('related', c => self.isRelatedColumn(t, c));
        });
    }

    private isSelectedColumn(t: MapTable, c: MapColumn): boolean {
        const node = this.selectedNode;
        return node?.data === 'columna' && node.label === c.label && node.parent?.label === t.label;
    }

    private matchesSearch(t: MapTable): boolean {
        const term = (this.searchTerm ?? '').trim().toLowerCase();
        if (!term) return true;
        return t.label.toLowerCase().includes(term) || t.columns.some(c => c.label.toLowerCase().includes(term));
    }

    private tableHeight(t: MapTable): number {
        return this.isExpanded(t) ? this.HEADER + t.columns.length * this.ROW + 2 * this.PAD : this.HEADER;
    }

    /** Writes the text, truncating it with "…" if it does not fit in maxWidth pixels */
    private fitText(el: SVGTextElement, text: string, maxWidth: number) {
        el.textContent = text ?? '';
        if (!text || el.getComputedTextLength() <= maxWidth) return;
        let lo = 0, hi = text.length;
        while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            el.textContent = text.substring(0, mid) + '…';
            if (el.getComputedTextLength() <= maxWidth) lo = mid; else hi = mid - 1;
        }
        el.textContent = text.substring(0, lo) + '…';
    }

    /** The relation starts or ends at the selected table or the one being dragged */
    private isActiveLink(l: MapLink): boolean {
        const selected = this.selectedTableLabel();
        return l.source.label === selected || l.target.label === selected
            || l.source.id === this.draggedTableId || l.target.id === this.draggedTableId;
    }

    private updateActiveLinks() {
        this.linkLayer.selectAll<SVGGElement, MapLink>('g.ds-map-link-group')
            .classed('active', l => this.isActiveLink(l));
    }

    private drawLinks() {
        // Each relation: visible line + wide transparent stroke so it is easy to click
        this.linkLayer.selectAll<SVGGElement, MapLink>('g.ds-map-link-group')
            .data(this.links, d => d.key)
            .join(enter => {
                const g = enter.append('g').attr('class', 'ds-map-link-group');
                g.append('path')
                    .attr('class', 'ds-map-link')
                    .attr('marker-start', 'url(#ds-map-dot)')
                    .attr('marker-end', 'url(#ds-map-dot)');
                g.append('path').attr('class', 'ds-map-link-hit').append('title');
                return g;
            })
            .classed('active', d => this.isActiveLink(d))
            .classed('selected', d => d.key === this.selectedLinkKey)
            .classed('dimmed', d => !this.matchesSearch(d.source) && !this.matchesSearch(d.target))
            .on('click', (event: MouseEvent, d) => {
                event.stopPropagation();
                this.selectedLinkKey = this.selectedLinkKey === d.key ? null : d.key;
                this.render();
            })
            .on('mouseenter', (event: MouseEvent, d) => {
                this.hoveredLinkKey = d.key;
                this.updateRelatedColumns();
            })
            .on('mouseleave', () => {
                this.hoveredLinkKey = null;
                this.updateRelatedColumns();
            })
            .select('title')
            .text(d => `${d.source.label}.${d.sourceColumns.join(', ')} = ${d.target.label}.${d.targetColumns.join(', ')}`);
    }

    private drawTables() {
        const self = this;
        // The table is brought to the front only when actually dragged: calling raise() on mousedown
        // moves the node in the DOM and the browser drops the click (a column could not be selected).
        let moved = false;
        const drag = d3.drag<SVGGElement, MapTable>()
            .clickDistance(4)
            .on('start', function () {
                moved = false;
            })
            .on('drag', function (event: d3.D3DragEvent<SVGGElement, MapTable, MapTable>, d) {
                if (!moved) {
                    moved = true;
                    d3.select(this).raise().classed('dragging', true);
                    self.draggedTableId = d.id;
                    self.updateActiveLinks();
                }
                self.autoFit = false;
                d.x += event.dx;
                d.y += event.dy;
                d3.select(this).attr('transform', `translate(${d.x},${d.y})`);
                self.updateLinks();
            })
            .on('end', function (event, d) {
                d3.select(this).classed('dragging', false);
                if (!moved) return;
                self.saveTablePosition(d);
                // Dragging does not fire click: select the table here (without expanding it)
                if (self.isSelected(d)) {
                    self.draggedTableId = null;
                } else {
                    self.skipExpand = true;
                    self.nodeSelected.emit({ node: d.node });
                }
            });

        const groups = this.nodeLayer.selectAll<SVGGElement, MapTable>('g.ds-map-table')
            .data(this.tables, d => d.id)
            .join('g')
            .attr('class', 'ds-map-table')
            .classed('selected', d => this.isSelected(d))
            .classed('dimmed', d => !this.matchesSearch(d))
            .attr('transform', d => `translate(${d.x},${d.y})`)
            .call(drag)
            .on('click', (event: MouseEvent, d) => this.nodeSelected.emit({ node: d.node }));

        // The content depends on the state (expanded / selected): redraw it
        groups.selectAll('*').remove();
        groups.each(function (d) {
            const g = d3.select(this);
            const expanded = self.isExpanded(d);
            const height = self.tableHeight(d);

            g.append('rect')
                .attr('class', 'ds-map-body')
                .attr('width', self.WIDTH)
                .attr('height', height)
                .attr('rx', self.RADIUS);

            g.append('path')
                .attr('class', 'ds-map-header')
                .attr('d', self.headerPath(expanded));

            const toggleX = self.WIDTH - 16 - self.TOGGLE;
            const toggle = g.append('g')
                .attr('class', 'ds-map-toggle')
                .attr('transform', `translate(${toggleX},${self.HEADER / 2})`)
                .on('click', (event: MouseEvent) => {
                    event.stopPropagation();
                    self.toggleTable(d);
                });
            toggle.append('circle').attr('r', self.TOGGLE);
            // Chevron: down when collapsed, up when expanded
            const c = self.TOGGLE * 0.4;
            toggle.append('path')
                .attr('d', expanded ? `M${-c},${c / 2} L0,${-c / 2} L${c},${c / 2}` : `M${-c},${-c / 2} L0,${c / 2} L${c},${-c / 2}`);
            toggle.append('title').text(expanded ? self.collapseSTR : self.expandSTR);

            const title = g.append('text')
                .attr('class', 'ds-map-title')
                .attr('x', 28)
                .attr('y', self.HEADER / 2)
                .attr('dy', '0.35em');
            self.fitText(title.node(), d.label, toggleX - self.TOGGLE - 24 - 28);

            g.append('title').text(d.label === d.id ? d.label : `${d.label} (${d.id})`);

            if (!expanded) return;

            g.append('line')
                .attr('class', 'ds-map-separator')
                .attr('x1', 0).attr('x2', self.WIDTH)
                .attr('y1', self.HEADER).attr('y2', self.HEADER);

            const rows = g.selectAll<SVGGElement, MapColumn>('g.ds-map-column')
                .data(d.columns)
                .join('g')
                .attr('class', 'ds-map-column')
                .classed('selected', c => self.isSelectedColumn(d, c))
                .classed('related', c => self.isRelatedColumn(d, c))
                .attr('transform', (c, i) => `translate(0,${self.HEADER + self.PAD + i * self.ROW})`)
                .on('click', (event: MouseEvent, c) => {
                    event.stopPropagation();
                    // editColumn needs the node's parent
                    c.node.parent = d.node;
                    self.nodeSelected.emit({ node: c.node });
                });

            rows.append('rect')
                .attr('class', 'ds-map-column-bg')
                .attr('x', 8)
                .attr('width', self.WIDTH - 16)
                .attr('height', self.ROW)
                .attr('rx', 12);

            rows.filter(c => d.relationColumns.has(c.technical))
                .append('circle')
                .attr('class', 'ds-map-key')
                .attr('cx', 34)
                .attr('cy', self.ROW / 2)
                .attr('r', 11);

            rows.each(function (c) {
                const row = d3.select(this);
                const type = row.append('text')
                    .attr('class', 'ds-map-column-type')
                    .attr('x', self.WIDTH - 28)
                    .attr('y', self.ROW / 2)
                    .attr('dy', '0.35em')
                    .attr('text-anchor', 'end')
                    .text(c.type);
                const label = row.append('text')
                    .attr('class', 'ds-map-column-label')
                    .attr('x', 62)
                    .attr('y', self.ROW / 2)
                    .attr('dy', '0.35em');
                self.fitText(label.node(), c.label, self.WIDTH - 62 - 28 - type.node().getComputedTextLength() - 24);
            });

            rows.append('title').text(c => c.label === c.technical ? c.label : `${c.label} (${c.technical})`);
        });
    }

    /** Header with rounded top corners (and bottom ones when collapsed) */
    private headerPath(expanded: boolean): string {
        const w = this.WIDTH, h = this.HEADER, r = this.RADIUS;
        const bottom = expanded
            ? `L${w},${h} L0,${h}`
            : `L${w},${h - r} Q${w},${h} ${w - r},${h} L${r},${h} Q0,${h} 0,${h - r}`;
        return `M0,${r} Q0,0 ${r},0 L${w - r},0 Q${w},0 ${w},${r} ${bottom} Z`;
    }

    private center(t: MapTable) {
        return { x: t.x + this.WIDTH / 2, y: t.y + this.tableHeight(t) / 2 };
    }

    /** Point on the table border in the direction of (toX, toY) */
    private clip(t: MapTable, toX: number, toY: number) {
        const c = this.center(t);
        const w = this.WIDTH / 2, h = this.tableHeight(t) / 2;
        const dx = toX - c.x, dy = toY - c.y;
        if (dx === 0 && dy === 0) return c;
        const s = Math.min(1, Math.min(dx ? w / Math.abs(dx) : Infinity, dy ? h / Math.abs(dy) : Infinity));
        return { x: c.x + dx * s, y: c.y + dy * s };
    }

    /** Relation endpoint: the column row if the table is expanded, otherwise the border */
    private anchor(t: MapTable, columns: string[], other: MapTable) {
        const oc = this.center(other);
        const idx = this.isExpanded(t) ? t.columns.findIndex(c => columns.includes(c.technical)) : -1;
        if (idx >= 0) {
            const y = t.y + this.HEADER + this.PAD + idx * this.ROW + this.ROW / 2;
            const x = oc.x < t.x + this.WIDTH / 2 ? t.x : t.x + this.WIDTH;
            return { x, y };
        }
        return this.clip(t, oc.x, oc.y);
    }

    private updateLinks() {
        // The updated datum lives on the group; d3 does not propagate it to child paths on redraws,
        // so it is read from the group to keep relations following the current tables.
        const self = this;
        this.linkLayer.selectAll<SVGGElement, MapLink>('g.ds-map-link-group')
            .each(function (l) {
                d3.select(this).selectAll('path').attr('d', self.linkPath(l));
            });
    }

    private linkPath(l: MapLink): string {
        if (l.source === l.target) {
            // Self-relation of a table: loop on the right side
            const t = l.source;
            const x = t.x + this.WIDTH;
            const y1 = t.y + 30, y2 = t.y + this.tableHeight(t) - 30;
            return `M${x},${y1} C${x + 180},${y1} ${x + 180},${y2} ${x},${y2}`;
        }
        const p1 = this.anchor(l.source, l.sourceColumns, l.target);
        const p2 = this.anchor(l.target, l.targetColumns, l.source);
        return `M${p1.x},${p1.y} L${p2.x},${p2.y}`;
    }
}
