import { FileUtiles } from '@eda/services/service.index';

/**
 * Shared per-category image ("icon") support for the D3 charts that opt into it via the chart
 * dialog's `hasIcons` feature (raceBar / bubblechart have their own transition-integrated versions;
 * funnel / treeMap / scatterPlot use `renderCategoryIcons` below).
 *
 * The dialog stores, per chart type that supports it:
 *   config.useIcons        : boolean          - master switch
 *   config.assignedIcons   : { value, icon }[] - one media-library URL per category (icon may be '')
 * and panel-chart.component.ts forwards both onto the chart's `inject`.
 */

export interface AssignedIcon { value: string | number; icon: string; }

/** category value (as string) -> image url, only for categories that actually have one and only when the switch is on. */
export function buildIconMap(assignedIcons: AssignedIcon[] | undefined, useIcons: boolean | undefined): Map<string, string> {
    if (!useIcons || !assignedIcons?.length) return new Map();
    return new Map(assignedIcons.filter(c => c.icon).map(c => [String(c.value), c.icon]));
}

/** Same resolution rules as shared/pipes/media-src.pipe.ts - D3 builds plain SVG <image> nodes outside the template compiler. */
export function resolveIconHref(raw: string, fileUtils: FileUtiles): string {
    if (!raw) return '';
    if (raw.startsWith('data:') || /^https?:\/\//.test(raw)) return raw;
    return fileUtils.connection(raw);
}

export interface RenderCategoryIconsOptions<D> {
    /** the <g> to render the icons into (created/owned by the caller). */
    group: any;
    /** bound data - one entry per mark that could carry an icon. */
    data: D[];
    /** stable key for the d3 join. */
    key: (d: D, index?: number) => string | number;
    /** centre of the badge, in the group's coordinate space. */
    x: (d: D) => number;
    y: (d: D) => number;
    /** side of the square box the image is fitted into (constant or per-datum). The image keeps
     * its own aspect ratio inside it (letterboxed, never cropped or stretched). */
    size: number | ((d: D) => number);
    /** final, resolved <image> href for this datum ('' -> badge hidden). */
    href: (d: D) => string;
    /** how the image sits inside its box - default 'xMidYMid meet' (centred, fitted). Use e.g.
     * 'xMidYMin meet' to top-align it so it sits flush against something above it. */
    align?: string | ((d: D) => string);
}

/**
 * Static (non-transitioning) per-category image layer. Safe to call on every (re)render: it clears
 * and rebuilds its own group, hides marks with no image, and hides one whose image fails to load
 * so a dead URL degrades to "no image" rather than a broken-image glyph.
 *
 * The image is drawn at its source aspect ratio, fitted (not cropped) inside a `size`×`size` box
 * centred on (x, y).
 */
export function renderCategoryIcons<D>(opts: RenderCategoryIconsOptions<D>): void {
    const { group, data, key, x, y, size, href, align = 'xMidYMid meet' } = opts;
    const sizeOf = typeof size === 'function' ? size : () => size;
    const alignOf = typeof align === 'function' ? align : () => align;

    const sel = group.selectAll('g.cat-icon').data(data.filter(d => !!href(d)), key as any);
    sel.exit().remove();

    const enter = sel.enter().append('g').attr('class', 'cat-icon');
    enter.append('image')
        .attr('class', 'cat-icon-img')
        // A dead/unreachable url degrades to "no image" instead of the browser's broken-image glyph.
        .on('error', (event: any) => {
            const g = event?.target?.parentNode;
            if (g && g.style) g.style.display = 'none';
        });

    const merged = enter.merge(sel as any);
    merged.attr('transform', (d: D) => `translate(${x(d)},${y(d)})`).style('display', null);
    merged.select('image.cat-icon-img')
        .attr('preserveAspectRatio', (d: D) => alignOf(d))
        .attr('x', (d: D) => -sizeOf(d) / 2).attr('y', (d: D) => -sizeOf(d) / 2)
        .attr('width', (d: D) => sizeOf(d)).attr('height', (d: D) => sizeOf(d))
        .attr('href', (d: D) => href(d));
}
