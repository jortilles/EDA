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
    id: string;          // nombre técnico de la tabla (table_name)
    label: string;       // nombre visible (display_name)
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
 * Vista mapa del modelo de datos: diagrama entidad-relación dibujado con d3.
 * Las tablas son nodos (arrastrables) y las relaciones aristas.
 * Al seleccionar una tabla se expande mostrando sus columnas.
 */
@Component({
    standalone: true,
    selector: 'app-data-source-map',
    templateUrl: './data-source-map.component.html',
    styleUrls: ['./data-source-map.component.css'],
    imports: [PrimengModule]
})
export class DataSourceMapComponent implements AfterViewInit, OnChanges, OnDestroy {
    @Input() treeData: TreeNode[] = [];
    @Input() selectedNode: TreeNode;
    @Input() searchTerm = '';
    @Output() nodeSelected = new EventEmitter<{ node: TreeNode }>();

    @ViewChild('svgMap', { static: true }) svgMap: ElementRef<SVGSVGElement>;

    public fitSTR = $localize`:@@dsMapFit:Ajustar a la pantalla`;
    public relayoutSTR = $localize`:@@dsMapRelayout:Reorganizar tablas`;
    public modelPropsSTR = $localize`:@@dsMapModelProps:Propiedades del modelo`;
    public expandSTR = $localize`:@@dsMapExpand:Mostrar columnas`;
    public collapseSTR = $localize`:@@dsMapCollapse:Ocultar columnas`;

    public tables: MapTable[] = [];
    private links: MapLink[] = [];
    // Posiciones de las tablas por nombre técnico. Es el objeto ds.metadata.map_layout del modelo,
    // de modo que se guardan con el modelo de datos y se recuperan al volver a abrirlo.
    private positions: { [table: string]: { x: number, y: number } } = {};

    private viewInit = false;
    // Tablas expandidas (nombre técnico). Al seleccionar una tabla se expande.
    private expanded = new Set<string>();
    // Relación seleccionada (clave de MapLink)
    private selectedLinkKey: string = null;
    // Mientras el usuario no haga zoom, desplace el lienzo o arrastre tablas, el mapa se ajusta a la pantalla
    private autoFit = true;
    private resizeObserver: ResizeObserver;
    private fitFrame: number;
    private zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
    private root: d3.Selection<SVGGElement, unknown, null, undefined>;
    private linkLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
    private nodeLayer: d3.Selection<SVGGElement, unknown, null, undefined>;

    private readonly WIDTH = 720;
    private readonly HEADER = 104;
    private readonly ROW = 76;
    private readonly PAD = 12;     // margen vertical de la lista de columnas
    private readonly RADIUS = 16;
    private readonly TOGGLE = 36;  // radio del botón de expandir / plegar

    constructor(private dataModelService: DataSourceService) { }

    ngAfterViewInit(): void {
        this.viewInit = true;
        this.initSvg();
        this.render();
        this.scheduleAutoFit();
        // Reajusta cuando cambia el tamaño disponible (cambio de vista, ventana, etc.)
        this.resizeObserver = new ResizeObserver(() => this.scheduleAutoFit());
        this.resizeObserver.observe(this.svgMap.nativeElement);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['selectedNode']) {
            this.expandSelected();
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

    /** Muestra las propiedades del modelo (nodo raíz del árbol) */
    selectModel() {
        if (this.treeData?.length) {
            this.nodeSelected.emit({ node: this.treeData[0] });
        }
    }

    /** Recalcula la disposición de todas las tablas */
    relayout() {
        this.positions = {};
        this.dataModelService.setMapLayout(this.positions);
        this.render();
        this.fitToView(true);
    }

    /** Ajuste automático en el siguiente frame, cuando el contenedor ya tiene su tamaño final */
    private scheduleAutoFit() {
        if (!this.autoFit) return;
        if (this.fitFrame) cancelAnimationFrame(this.fitFrame);
        this.fitFrame = requestAnimationFrame(() => {
            this.fitFrame = null;
            if (this.autoFit) this.fitToView(false);
        });
    }

    /** Ajusta el zoom para que se vean todas las tablas */
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
        const scale = Math.min(0.9 * width / bw, 0.9 * height / bh, 1);
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

        // Marcador para los extremos de las relaciones
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
                // sourceEvent sólo existe cuando el zoom lo provoca el usuario (rueda, arrastre del lienzo)
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

    /** Guarda la posición de la tabla movida en el diseño del modelo y lo marca como pendiente de guardar */
    private saveTablePosition(t: MapTable) {
        this.positions[t.id] = { x: Math.round(t.x), y: Math.round(t.y) };
        // Se descartan las posiciones de tablas que ya no existen en el modelo
        const ids = new Set(this.tables.map(table => table.id));
        Object.keys(this.positions).filter(id => !ids.has(id)).forEach(id => delete this.positions[id]);
        this.dataModelService.setMapLayout(this.positions);
    }

    /** Construye tablas y relaciones a partir del árbol y del modelo de datos */
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

        // Las relaciones se guardan en las dos tablas: se eliminan duplicados
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

    /** Coloca con una simulación de fuerzas las tablas que aún no tienen posición */
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
                // Las tablas ya colocadas no se mueven
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

    /** Expande la tabla seleccionada (o la tabla de la columna seleccionada) */
    private expandSelected() {
        const label = this.selectedTableLabel();
        if (!label) return;
        const table = (this.dataModelService.getModel() ?? []).find(t => (t.display_name?.default ?? t.table_name) === label);
        if (table) this.expanded.add(table.table_name);
    }

    /** Botón de la cabecera: expande (y selecciona) o pliega la tabla */
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

    /** La columna forma parte de la relación seleccionada */
    private isRelatedColumn(t: MapTable, c: MapColumn): boolean {
        const link = this.links.find(l => l.key === this.selectedLinkKey);
        if (!link) return false;
        return (link.source.id === t.id && link.sourceColumns.includes(c.technical))
            || (link.target.id === t.id && link.targetColumns.includes(c.technical));
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

    /** Escribe el texto recortándolo con "…" si no cabe en maxWidth píxeles */
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

    private drawLinks() {
        const selected = this.selectedTableLabel();
        // Cada relación: línea visible + trazo ancho transparente para poder pulsarla con facilidad
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
            .classed('active', d => d.source.label === selected || d.target.label === selected)
            .classed('selected', d => d.key === this.selectedLinkKey)
            .classed('dimmed', d => !this.matchesSearch(d.source) && !this.matchesSearch(d.target))
            .on('click', (event: MouseEvent, d) => {
                event.stopPropagation();
                this.selectedLinkKey = this.selectedLinkKey === d.key ? null : d.key;
                this.render();
            })
            .select('title')
            .text(d => `${d.source.label}.${d.sourceColumns.join(', ')} = ${d.target.label}.${d.targetColumns.join(', ')}`);
    }

    private drawTables() {
        const self = this;
        // Se trae la tabla al frente sólo cuando realmente se arrastra: hacer raise() en el mousedown
        // mueve el nodo en el DOM y el navegador descarta el click (no se podría seleccionar una columna).
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
                }
                self.autoFit = false;
                d.x += event.dx;
                d.y += event.dy;
                d3.select(this).attr('transform', `translate(${d.x},${d.y})`);
                self.updateLinks();
            })
            .on('end', function (event, d) {
                d3.select(this).classed('dragging', false);
                if (moved) self.saveTablePosition(d);
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

        // El contenido depende del estado (expandida / seleccionada): se redibuja
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
            // Chevron: hacia abajo si está plegada, hacia arriba si está expandida
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
                    // editColumn necesita el padre del nodo
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

    /** Cabecera con las esquinas superiores redondeadas (y las inferiores si está plegada) */
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

    /** Punto del borde de la tabla en dirección a (toX, toY) */
    private clip(t: MapTable, toX: number, toY: number) {
        const c = this.center(t);
        const w = this.WIDTH / 2, h = this.tableHeight(t) / 2;
        const dx = toX - c.x, dy = toY - c.y;
        if (dx === 0 && dy === 0) return c;
        const s = Math.min(1, Math.min(dx ? w / Math.abs(dx) : Infinity, dy ? h / Math.abs(dy) : Infinity));
        return { x: c.x + dx * s, y: c.y + dy * s };
    }

    /** Extremo de la relación: la fila de la columna si la tabla está expandida, si no el borde */
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
        // El dato actualizado está en el grupo; d3 no lo propaga a las líneas hijas en los redibujados,
        // así que se toma del grupo para que las relaciones sigan siempre a las tablas actuales.
        const self = this;
        this.linkLayer.selectAll<SVGGElement, MapLink>('g.ds-map-link-group')
            .each(function (l) {
                d3.select(this).selectAll('path').attr('d', self.linkPath(l));
            });
    }

    private linkPath(l: MapLink): string {
        if (l.source === l.target) {
            // Relación de una tabla consigo misma: bucle en el lateral derecho
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
