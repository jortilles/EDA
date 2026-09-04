import { Component, ElementRef, EventEmitter, inject, Input, OnDestroy, OnInit, Output, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DropdownModule } from 'primeng/dropdown';
import { forkJoin } from 'rxjs';
import { AlertService, MediaService, IMedia, IMediaFolder } from '@eda/services/service.index';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { PipesModule } from '@eda/pipes/pipes.module';
import Swal from 'sweetalert2';

export const MEDIA_MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB
const VALID_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

/**
 * Media library, file-explorer style: folders, a drop/click zone to upload new
 * images, grid/list views, click / Ctrl+click / Shift+click / drag-to-select,
 * a right-side detail panel for the current selection (or a summary when
 * several are selected), and a navigable slideshow preview.
 * Used both as the standalone admin page (`pickMode = false`, every
 * organization tool available) and embedded inside a dialog as a plain image
 * picker (`pickMode = true`, single click selects, no side panel/shortcuts -
 * the folder/rename/move/delete tools are admin-only and blocked server-side
 * too, so they stay hidden here).
 */
@Component({
  standalone: true,
  selector: 'app-media-library',
  templateUrl: './media-library.component.html',
  styleUrls: ['./media-library.component.css'],
  imports: [CommonModule, FormsModule, RouterLink, IconComponent, EdaDialog2Component, PipesModule, DropdownModule]
})
export class MediaLibraryComponent implements OnInit, OnDestroy {
  @Input() pickMode = false;
  @Output() select = new EventEmitter<string>();

  // Reusable, always-in-the-DOM (off-screen) drag previews - see setDragGhost(). Reusing the same
  // elements instead of creating a throwaway node per drag avoids the browser occasionally using
  // its own default screenshot preview because a brand-new node hadn't been painted yet.
  @ViewChild('fileDragGhost') private fileDragGhostRef?: ElementRef<HTMLElement>;
  @ViewChild('fileDragGhostBadge') private fileDragGhostBadgeRef?: ElementRef<HTMLElement>;
  @ViewChild('folderDragGhost') private folderDragGhostRef?: ElementRef<HTMLElement>;

  private mediaService = inject(MediaService);
  private alertService = inject(AlertService);

  public showOrgTools = computed(() => !this.pickMode);

  public items = signal<IMedia[]>([]);
  public folders = signal<IMediaFolder[]>([]);
  public currentFolderId = signal<string | null>(null);
  public currentFolder = computed(() => this.folders().find(f => f._id === this.currentFolderId()) ?? null);

  /** Full path from root to the current folder, for the breadcrumb. */
  public currentPath = computed(() => {
    const byId = new Map(this.folders().map(f => [f._id, f]));
    const path: IMediaFolder[] = [];
    let f = this.currentFolder();
    while (f) {
      path.unshift(f);
      f = f.parentId ? byId.get(f.parentId) ?? null : null;
    }
    return path;
  });

  /** Direct subfolders of the folder currently being browsed. */
  public childFolders = computed(() => this.folders().filter(f => (f.parentId ?? null) === this.currentFolderId()));

  /** Which folder ids are expanded in the tree - starts empty (everything collapsed by default). */
  public expandedFolderIds = signal<Set<string>>(new Set());

  /** Left-side folder tree, flattened depth-first, respecting expandedFolderIds. */
  public folderTree = computed(() => {
    const expanded = this.expandedFolderIds();
    const byParent = new Map<string | null, IMediaFolder[]>();
    for (const f of this.folders()) {
      const key = f.parentId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(f);
    }
    const result: { folder: IMediaFolder, depth: number, hasChildren: boolean, isExpanded: boolean }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      const children = (byParent.get(parentId) || []).slice().sort((a, b) => a.name.localeCompare(b.name));
      for (const child of children) {
        const hasChildren = (byParent.get(child._id) || []).length > 0;
        const isExpanded = expanded.has(child._id);
        result.push({ folder: child, depth, hasChildren, isExpanded });
        if (hasChildren && isExpanded) {
          walk(child._id, depth + 1);
        }
      }
    };
    walk(null, 0);
    return result;
  });

  toggleTreeNode(folderId: string, event: Event): void {
    event.stopPropagation();
    const set = new Set(this.expandedFolderIds());
    if (set.has(folderId)) set.delete(folderId); else set.add(folderId);
    this.expandedFolderIds.set(set);
  }

  /** Reveals the path to a folder in the tree by expanding all of its ancestors. */
  private expandAncestorsOf(folder: IMediaFolder): void {
    const byId = new Map(this.folders().map(f => [f._id, f]));
    const set = new Set(this.expandedFolderIds());
    let f: IMediaFolder | null = folder.parentId ? byId.get(folder.parentId) ?? null : null;
    while (f) {
      set.add(f._id);
      f = f.parentId ? byId.get(f.parentId) ?? null : null;
    }
    this.expandedFolderIds.set(set);
  }

  public loading = signal<boolean>(false);
  public uploading = signal<boolean>(false);
  public isDragging = signal<boolean>(false);

  public viewMode = signal<'grid' | 'list'>('grid');

  public searchTerm = signal<string>('');

  public sortBy = signal<'newest' | 'oldest' | 'name' | 'size'>('newest');
  readonly sortOptions = [
    { label: $localize`:@@mediaSortNewest:Más recientes`, value: 'newest' },
    { label: $localize`:@@mediaSortOldest:Más antiguas`, value: 'oldest' },
    { label: $localize`:@@mediaSortName:Nombre (A-Z)`, value: 'name' },
    { label: $localize`:@@mediaSortSize:Tamaño`, value: 'size' }
  ];

  onSortChange(value: string): void {
    this.sortBy.set(value as 'newest' | 'oldest' | 'name' | 'size');
    this.setPage(1);
  }

  /** Items in the current folder matching the search box (or all of them) and sorted. */
  public filteredItems = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = term ? this.items().filter(i => i.originalName.toLowerCase().includes(term)) : this.items();

    const sort = this.sortBy();
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'name': return a.originalName.localeCompare(b.originalName);
        case 'size': return b.size - a.size;
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'newest':
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  });

  // --- selection ---------------------------------------------------------------
  public selectedIds = signal<Set<string>>(new Set());
  private lastClickedId: string | null = null;

  public selectedItem = computed<IMedia | null>(() => {
    const ids = this.selectedIds();
    if (ids.size !== 1) return null;
    const [id] = ids;
    return this.items().find(i => i._id === id) ?? null;
  });

  public selectedTotalSize = computed(() => {
    const ids = this.selectedIds();
    return this.items().filter(i => ids.has(i._id)).reduce((sum, i) => sum + (i.size || 0), 0);
  });

  /** First 4 selected images, for the little overlapping thumbnail stack in the multi-select summary. */
  public selectedPreviewThumbs = computed(() => {
    const ids = this.selectedIds();
    return this.items().filter(i => ids.has(i._id)).slice(0, 4);
  });

  /** Placeholder tiles shown while a folder's images are loading. */
  readonly skeletonCount = Array.from({ length: 12 });

  public allOnPageSelected = computed(() => {
    const page = this.paginatedItems();
    return page.length > 0 && page.every(i => this.selectedIds().has(i._id));
  });

  public previewUsage = signal<{ _id: string, title: string }[] | null>(null);
  public loadingUsage = signal<boolean>(false);

  /** Pixel dimensions of the selected image, read client-side once it loads (not stored server-side). */
  public imageDimensions = signal<{ width: number, height: number } | null>(null);

  // --- side panel appear/disappear (kept in the DOM a bit longer than the selection itself,
  // so the disappear animation - the same slide-in, reversed - has time to play) --------------
  public showSidePanel = signal<boolean>(false);
  public panelClosing = signal<boolean>(false);
  private closeTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // --- drag-to-select (marquee) --------------------------------------------------
  public marqueeRect = signal<{ left: number, top: number, width: number, height: number } | null>(null);
  private marqueeStart: { x: number, y: number } | null = null;
  private marqueeContainer: HTMLElement | null = null;

  // --- move-to-folder ---------------------------------------------------------------
  public showMoveMenu = signal<boolean>(false);

  // --- slideshow ---------------------------------------------------------------------
  public slideshowIndex = signal<number | null>(null);
  public slideshowItem = computed<IMedia | null>(() => {
    const idx = this.slideshowIndex();
    return idx === null ? null : (this.items()[idx] ?? null);
  });

  public currentPage = signal<number>(1);
  public itemsPerPage = signal<number>(24);
  readonly pageSizeOptions = [12, 24, 48, 96];

  /** How many elements (subfolders + files) live in the folder currently being browsed. */
  public currentFolderItemCount = computed(() => this.childFolders().length + this.items().length);

  public totalPages = computed(() => Math.max(1, Math.ceil(this.filteredItems().length / this.itemsPerPage())));
  public pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  public paginatedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filteredItems().slice(start, start + this.itemsPerPage());
  });

  ngOnInit(): void {
    this.loadFolders();
    this.loadMedia();
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousemove', this.onMarqueeMove);
    document.removeEventListener('mouseup', this.onMarqueeUp);
    if (this.closeTimeoutId) clearTimeout(this.closeTimeoutId);
  }

  // --- loading -------------------------------------------------------------

  loadFolders(): void {
    this.mediaService.listFolders().subscribe({
      next: (res: any) => this.folders.set(res.folders || []),
      error: (err: any) => this.alertService.addError(err)
    });
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.setPage(1);
  }

  loadMedia(): void {
    this.loading.set(true);
    this.mediaService.list(this.currentFolderId()).subscribe({
      next: (res: any) => {
        this.items.set(res.media || []);
        this.currentPage.set(1);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.alertService.addError(err);
      }
    });
  }

  // --- folder navigation -----------------------------------------------------

  openFolder(folder: IMediaFolder): void {
    this.currentFolderId.set(folder._id);
    this.expandAncestorsOf(folder);
    this.clearSelection();
    this.loadMedia();
  }

  goToRoot(): void {
    this.currentFolderId.set(null);
    this.clearSelection();
    this.loadMedia();
  }

  // --- folder CRUD (admin only) ----------------------------------------------

  createFolder(): void {
    Swal.fire({
      title: $localize`:@@mediaNewFolder:Nueva carpeta`,
      input: 'text',
      inputPlaceholder: $localize`:@@mediaFolderNamePlaceholder:Nombre de la carpeta`,
      showCancelButton: true,
      confirmButtonText: $localize`:@@mediaCreate:Crear`,
      cancelButtonText: $localize`:@@cancel:Cancelar`
    }).then((result) => {
      const name = (result.value || '').trim();
      if (result.isConfirmed && name) {
        this.mediaService.createFolder(name, this.currentFolderId()).subscribe({
          next: () => this.loadFolders(),
          error: (err: any) => this.alertService.addError(err)
        });
      }
    });
  }

  renameFolder(folder: IMediaFolder, event: Event): void {
    event.stopPropagation();
    Swal.fire({
      title: $localize`:@@mediaRenameFolder:Renombrar carpeta`,
      input: 'text',
      inputValue: folder.name,
      showCancelButton: true,
      confirmButtonText: $localize`:@@mediaSave:Guardar`,
      cancelButtonText: $localize`:@@cancel:Cancelar`
    }).then((result) => {
      const name = (result.value || '').trim();
      if (result.isConfirmed && name) {
        this.mediaService.renameFolder(folder._id, name).subscribe({
          next: () => this.loadFolders(),
          error: (err: any) => this.alertService.addError(err)
        });
      }
    });
  }

  deleteFolder(folder: IMediaFolder, event: Event): void {
    event.stopPropagation();
    Swal.fire({
      title: $localize`:@@mediaDeleteFolderConfirmTitle:¿Eliminar esta carpeta?`,
      text: folder.name,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: $localize`:@@delete:Eliminar`,
      cancelButtonText: $localize`:@@cancel:Cancelar`
    }).then((result) => {
      if (result.isConfirmed) {
        this.mediaService.deleteFolder(folder._id).subscribe({
          next: () => this.loadFolders(),
          error: (err: any) => this.alertService.addError(err)
        });
      }
    });
  }

  // --- upload ----------------------------------------------------------------

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.uploadFile(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (file) this.uploadFile(file);
    input.value = '';
  }

  private uploadFile(file: File): void {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (VALID_EXTENSIONS.indexOf(extension) < 0) {
      this.alertService.addError($localize`:@@mediaInvalidExtension:Formato de imagen no válido. Formatos permitidos: PNG, JPG, GIF, WEBP.`);
      return;
    }
    if (file.size > MEDIA_MAX_SIZE_BYTES) {
      this.alertService.addError($localize`:@@mediaMaxSizeError:La imagen supera el tamaño máximo permitido de 1MB.`);
      return;
    }

    this.uploading.set(true);
    this.mediaService.upload(file, file.name, this.currentFolderId()).then((res) => {
      this.uploading.set(false);
      this.items.update(list => [res.media, ...list]);
      this.setPage(1); // show the just-uploaded image
      if (this.pickMode) {
        this.select.emit(res.media.url);
      }
    }).catch((err) => {
      this.uploading.set(false);
      this.alertService.addError(err);
    });
  }

  // --- pick mode ---------------------------------------------------------------

  choose(item: IMedia): void {
    this.select.emit(item.url);
  }

  // --- selection -----------------------------------------------------------------

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  private setSelection(ids: Set<string>): void {
    if (ids.size === 0 && this.selectedIds().size > 0) {
      // Closing: keep the old selection (and its detail data) around while the panel animates
      // out, instead of blanking it immediately - updateSidePanelVisibility clears it for real
      // once the exit animation finishes.
      this.updateSidePanelVisibility(false);
      return;
    }
    this.selectedIds.set(ids);
    this.syncUsage();
    this.syncDimensions();
    this.updateSidePanelVisibility(ids.size > 0);
  }

  /**
   * Keeps the side panel mounted for the duration of its CSS exit animation instead of
   * unmounting it the instant the selection is cleared - `mediaSlideOut` is the exact reverse
   * of the entrance `mediaSlideIn` (see the .css), so this just needs to give it time to play.
   */
  private updateSidePanelVisibility(hasSelection: boolean): void {
    if (this.closeTimeoutId) {
      clearTimeout(this.closeTimeoutId);
      this.closeTimeoutId = null;
    }
    if (hasSelection) {
      this.panelClosing.set(false);
      this.showSidePanel.set(true);
    } else if (this.showSidePanel()) {
      this.panelClosing.set(true);
      this.closeTimeoutId = setTimeout(() => {
        this.selectedIds.set(new Set());
        this.previewUsage.set(null);
        this.imageDimensions.set(null);
        this.showSidePanel.set(false);
        this.panelClosing.set(false);
        this.closeTimeoutId = null;
      }, 280);
    }
  }

  private syncUsage(): void {
    const item = this.selectedItem();
    if (!item) {
      this.previewUsage.set(null);
      this.loadingUsage.set(false);
      return;
    }
    this.loadingUsage.set(true);
    this.previewUsage.set(null);
    this.mediaService.usage(item._id).subscribe({
      next: (res: any) => {
        this.previewUsage.set(res.usedIn || []);
        this.loadingUsage.set(false);
      },
      error: () => this.loadingUsage.set(false)
    });
  }

  private syncDimensions(): void {
    this.imageDimensions.set(null);
    const item = this.selectedItem();
    if (!item) return;

    const img = new Image();
    img.onload = () => {
      // ignore a late load if the selection moved on to something else meanwhile
      if (this.selectedItem()?._id === item._id) {
        this.imageDimensions.set({ width: img.naturalWidth, height: img.naturalHeight });
      }
    };
    img.src = this.mediaService.resolveUrl(item.url);
  }

  /** Copies the image's absolute, authenticated URL - e.g. to paste into an HTML text box in a table. */
  copyImageUrl(item: IMedia): void {
    const url = this.mediaService.resolveUrl(item.url);
    navigator.clipboard.writeText(url).then(() => {
      this.alertService.addSuccess($localize`:@@mediaUrlCopied:URL copiada al portapapeles`);
    }).catch(() => {
      this.alertService.addError($localize`:@@mediaCopyUrlError:No se pudo copiar la URL`);
    });
  }

  /** Downloads the original file - fetched as a blob (not a plain <a download>) so it works
   *  regardless of whether the API happens to be same-origin or behind a different proxy path. */
  async downloadImage(item: IMedia): Promise<void> {
    try {
      const response = await fetch(this.mediaService.resolveUrl(item.url));
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = item.originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      this.alertService.addError($localize`:@@mediaDownloadError:No se pudo descargar la imagen`);
    }
  }

  extensionOf(item: IMedia): string {
    const fromName = item.originalName.split('.').pop();
    const ext = fromName || item.mimeType.split('/').pop() || '';
    return ext.toUpperCase();
  }

  /** Checkbox click toggles just that one item, same as Ctrl+click, without affecting the rest of the selection. */
  onCheckboxClick(item: IMedia, event: Event): void {
    event.stopPropagation();
    const set = new Set(this.selectedIds());
    if (set.has(item._id)) set.delete(item._id); else set.add(item._id);
    this.setSelection(set);
    this.lastClickedId = item._id;
  }

  clearSelection(): void {
    this.setSelection(new Set());
  }

  toggleSelectAll(): void {
    if (this.allOnPageSelected()) {
      this.clearSelection();
    } else {
      this.setSelection(new Set(this.paginatedItems().map(i => i._id)));
    }
  }

  onTileClick(item: IMedia, event: MouseEvent): void {
    if (this.pickMode) {
      this.setSelection(new Set([item._id]));
      return;
    }

    if (event.shiftKey && this.lastClickedId) {
      const list = this.paginatedItems();
      const fromIdx = list.findIndex(i => i._id === this.lastClickedId);
      const toIdx = list.findIndex(i => i._id === item._id);
      if (fromIdx > -1 && toIdx > -1) {
        const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
        this.setSelection(new Set(list.slice(start, end + 1).map(i => i._id)));
      }
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      const set = new Set(this.selectedIds());
      if (set.has(item._id)) set.delete(item._id); else set.add(item._id);
      this.setSelection(set);
      this.lastClickedId = item._id;
      return;
    }

    // plain click on the only selected item toggles it off, like a real file explorer
    if (this.selectedIds().size === 1 && this.selectedIds().has(item._id)) {
      this.setSelection(new Set());
    } else {
      this.setSelection(new Set([item._id]));
    }
    this.lastClickedId = item._id;
  }

  // --- drag-to-select (marquee) + click-outside-deselects, admin only ----------------
  // Bound to the whole component (see the .html) so the drag region isn't cut off at the
  // grid's edges - it just never starts on anything interactive, and only .media-card
  // elements are ever actually selected regardless of where the drag passes over.
  private static readonly INTERACTIVE_SELECTOR =
    '.media-card, .media-folder-tile, .media-tree-node, button, a, input, select, textarea, .p-dropdown';

  onGridMouseDown(event: MouseEvent): void {
    if (this.pickMode) return;
    const target = event.target as HTMLElement;
    if (target.closest(MediaLibraryComponent.INTERACTIVE_SELECTOR)) return;
    const container = event.currentTarget as HTMLElement;
    this.marqueeContainer = container;
    const rect = container.getBoundingClientRect();
    this.marqueeStart = {
      x: event.clientX - rect.left + container.scrollLeft,
      y: event.clientY - rect.top + container.scrollTop
    };
    this.marqueeRect.set({ left: this.marqueeStart.x, top: this.marqueeStart.y, width: 0, height: 0 });
    document.addEventListener('mousemove', this.onMarqueeMove);
    document.addEventListener('mouseup', this.onMarqueeUp);
    event.preventDefault();
  }

  private onMarqueeMove = (event: MouseEvent): void => {
    if (!this.marqueeStart || !this.marqueeContainer) return;
    const rect = this.marqueeContainer.getBoundingClientRect();
    const x = event.clientX - rect.left + this.marqueeContainer.scrollLeft;
    const y = event.clientY - rect.top + this.marqueeContainer.scrollTop;
    this.marqueeRect.set({
      left: Math.min(x, this.marqueeStart.x),
      top: Math.min(y, this.marqueeStart.y),
      width: Math.abs(x - this.marqueeStart.x),
      height: Math.abs(y - this.marqueeStart.y)
    });
  };

  private onMarqueeUp = (): void => {
    const container = this.marqueeContainer;
    const marquee = this.marqueeRect();

    if (container && marquee) {
      if (marquee.width > 3 || marquee.height > 3) {
        // a real drag: select whatever image tiles the rectangle intersects
        const containerRect = container.getBoundingClientRect();
        const selLeft = containerRect.left + marquee.left - container.scrollLeft;
        const selTop = containerRect.top + marquee.top - container.scrollTop;
        const selRight = selLeft + marquee.width;
        const selBottom = selTop + marquee.height;

        const ids: string[] = [];
        container.querySelectorAll<HTMLElement>('.media-card[data-id]').forEach((el) => {
          const r = el.getBoundingClientRect();
          const intersects = r.left < selRight && r.right > selLeft && r.top < selBottom && r.bottom > selTop;
          if (intersects && el.dataset['id']) ids.push(el.dataset['id']!);
        });
        this.setSelection(new Set(ids));
      } else {
        // a plain click on empty background, not a drag: click-outside-an-image deselects all
        this.clearSelection();
      }
    }

    this.marqueeStart = null;
    this.marqueeContainer = null;
    this.marqueeRect.set(null);
    document.removeEventListener('mousemove', this.onMarqueeMove);
    document.removeEventListener('mouseup', this.onMarqueeUp);
  };

  // --- toolbar actions on the current selection (admin only) -------------------------

  private deleteByIds(ids: string[], confirmTitle: string, confirmText?: string): void {
    Swal.fire({
      title: confirmTitle,
      text: confirmText,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: $localize`:@@delete:Eliminar`,
      cancelButtonText: $localize`:@@cancel:Cancelar`
    }).then((result) => {
      if (!result.isConfirmed) return;
      forkJoin(ids.map(id => this.mediaService.remove(id))).subscribe({
        next: () => {
          this.items.update(list => list.filter(m => !ids.includes(m._id)));
          const remaining = new Set(this.selectedIds());
          ids.forEach(id => remaining.delete(id));
          this.setSelection(remaining);
          if (this.currentPage() > this.totalPages()) {
            this.setPage(this.totalPages());
          }
        },
        error: (err: any) => this.alertService.addError(err)
      });
    });
  }

  deleteSelected(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    const isSingle = ids.length === 1;
    const singleItem = isSingle ? this.items().find(i => i._id === ids[0]) : null;
    this.deleteByIds(
      ids,
      isSingle
        ? $localize`:@@mediaDeleteConfirmTitle:¿Eliminar esta imagen?`
        : $localize`:@@mediaBulkDeleteConfirmTitle:¿Eliminar las imágenes seleccionadas?`,
      isSingle ? singleItem?.originalName : `${ids.length}`
    );
  }

  /** Per-card delete icon, shown on hover - deletes that one image regardless of the current selection. */
  removeOne(item: IMedia, event: Event): void {
    event.stopPropagation();
    this.deleteByIds([item._id], $localize`:@@mediaDeleteConfirmTitle:¿Eliminar esta imagen?`, item.originalName);
  }

  renameSelected(): void {
    const item = this.selectedItem();
    if (!item) return;
    Swal.fire({
      title: $localize`:@@mediaRenameTitle:Renombrar imagen`,
      input: 'text',
      inputValue: item.originalName,
      showCancelButton: true,
      confirmButtonText: $localize`:@@mediaSave:Guardar`,
      cancelButtonText: $localize`:@@cancel:Cancelar`
    }).then((result) => {
      const name = (result.value || '').trim();
      if (result.isConfirmed && name) {
        this.mediaService.rename(item._id, name).subscribe({
          next: () => this.items.update(list => list.map(m => m._id === item._id ? { ...m, originalName: name } : m)),
          error: (err: any) => this.alertService.addError(err)
        });
      }
    });
  }

  openMoveMenu(): void {
    if (!this.selectedIds().size) return;
    this.showMoveMenu.set(true);
  }

  confirmMove(folderId: string | null): void {
    const ids = [...this.selectedIds()];
    this.showMoveMenu.set(false);
    if (!ids.length) return;

    this.mediaService.move(ids, folderId).subscribe({
      next: () => {
        this.clearSelection();
        this.loadMedia();
        this.loadFolders(); // refresh folder file counts
        this.alertService.addSuccess($localize`:@@mediaMoveSuccess:Movido correctamente`);
      },
      error: (err: any) => this.alertService.addError(err)
    });
  }

  // --- drag-and-drop to move (native HTML5 DnD): image cards and folder tiles are draggable,
  // folder tiles + every tree node (including "Inicio"/root) are drop targets. ------------------

  public dragOverFolderId = signal<string | 'root' | null>(null);

  onCardDragStart(item: IMedia, event: DragEvent): void {
    if (!this.showOrgTools()) { event.preventDefault(); return; }
    // dragging a card that's part of a multi-selection moves the whole selection together
    const ids = this.selectedIds().has(item._id) && this.selectedIds().size > 1
      ? [...this.selectedIds()]
      : [item._id];
    event.dataTransfer?.setData('application/json', JSON.stringify({ type: 'file', ids }));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    this.setDragGhost(event, 'file', ids.length);
  }

  onFolderDragStart(folder: IMediaFolder, event: DragEvent): void {
    if (!this.showOrgTools()) { event.preventDefault(); return; }
    event.dataTransfer?.setData('application/json', JSON.stringify({ type: 'folder', id: folder._id }));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    event.stopPropagation();
    this.setDragGhost(event, 'folder', 1);
  }

  /**
   * Replaces the browser's default drag preview (a screenshot of the dragged element, which for
   * a whole multi-selection just shows whatever tile happened to start the drag) with the small
   * corporate-color badge in the .html (#fileDragGhost/#folderDragGhost) - reused every time, not
   * created on the fly, so the browser always has a fully painted element to snapshot.
   */
  private setDragGhost(event: DragEvent, kind: 'file' | 'folder', count: number): void {
    if (!event.dataTransfer) return;
    const ghost = kind === 'file' ? this.fileDragGhostRef?.nativeElement : this.folderDragGhostRef?.nativeElement;
    if (!ghost) return;

    const badge = this.fileDragGhostBadgeRef?.nativeElement;
    if (badge) {
      if (kind === 'file' && count > 1) {
        badge.textContent = String(count);
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }

    event.dataTransfer.setDragImage(ghost, 32, 32);
  }

  onDropTargetDragOver(event: DragEvent): void {
    event.preventDefault(); // required for the drop event to fire at all
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  onDropTargetDragEnter(id: string | 'root', event: DragEvent): void {
    event.preventDefault();
    this.dragOverFolderId.set(id);
  }

  onDropTargetDragLeave(id: string | 'root'): void {
    if (this.dragOverFolderId() === id) this.dragOverFolderId.set(null);
  }

  onDropOnFolder(targetFolderId: string | null, event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverFolderId.set(null);

    const raw = event.dataTransfer?.getData('application/json');
    if (!raw) return;
    let payload: any;
    try { payload = JSON.parse(raw); } catch { return; }

    if (payload.type === 'file' && Array.isArray(payload.ids) && payload.ids.length) {
      this.mediaService.move(payload.ids, targetFolderId).subscribe({
        next: () => {
          this.clearSelection();
          this.loadMedia();
          this.loadFolders();
          this.alertService.addSuccess($localize`:@@mediaMoveSuccess:Movido correctamente`);
        },
        error: (err: any) => this.alertService.addError(err)
      });
    } else if (payload.type === 'folder' && payload.id) {
      if (payload.id === targetFolderId) return;
      if (this.isDescendantOf(targetFolderId, payload.id)) {
        this.alertService.addError($localize`:@@mediaCannotMoveIntoOwnSubfolder:No puedes mover una carpeta dentro de sí misma o de una subcarpeta suya.`);
        return;
      }
      this.mediaService.moveFolder(payload.id, targetFolderId).subscribe({
        next: () => {
          this.loadFolders();
          this.alertService.addSuccess($localize`:@@mediaMoveSuccess:Movido correctamente`);
        },
        error: (err: any) => this.alertService.addError(err)
      });
    }
  }

  private isDescendantOf(candidateId: string | null, ancestorId: string): boolean {
    const byId = new Map(this.folders().map(f => [f._id, f]));
    let f = candidateId ? byId.get(candidateId) ?? null : null;
    while (f) {
      if (f._id === ancestorId) return true;
      f = f.parentId ? byId.get(f.parentId) ?? null : null;
    }
    return false;
  }

  // --- slideshow (only triggered by clicking the photo in the side panel) ------------------

  openSlideshow(item: IMedia): void {
    const idx = this.items().findIndex(i => i._id === item._id);
    if (idx > -1) this.slideshowIndex.set(idx);
  }

  closeSlideshow(): void {
    this.slideshowIndex.set(null);
  }

  slidePrev(): void {
    const len = this.items().length;
    if (!len) return;
    this.slideshowIndex.update(i => i === null ? 0 : (i - 1 + len) % len);
  }

  slideNext(): void {
    const len = this.items().length;
    if (!len) return;
    this.slideshowIndex.update(i => i === null ? 0 : (i + 1) % len);
  }

  onSlideshowKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') this.slidePrev();
    else if (event.key === 'ArrowRight') this.slideNext();
    else if (event.key === 'Escape') this.closeSlideshow();
  }

  // --- view / pagination -----------------------------------------------------------

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
  }

  setPage(page: number): void {
    this.currentPage.set(page);
  }

  setPageSize(size: number): void {
    this.itemsPerPage.set(size);
    this.setPage(1);
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 KB';
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
}
