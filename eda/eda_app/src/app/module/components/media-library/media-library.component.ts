import { Component, EventEmitter, inject, Input, OnDestroy, OnInit, Output, computed, signal } from '@angular/core';
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

  /** Left-side folder tree, flattened depth-first (always fully expanded, matches the sketch). */
  public folderTree = computed(() => {
    const byParent = new Map<string | null, IMediaFolder[]>();
    for (const f of this.folders()) {
      const key = f.parentId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(f);
    }
    const result: { folder: IMediaFolder, depth: number }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      const children = (byParent.get(parentId) || []).slice().sort((a, b) => a.name.localeCompare(b.name));
      for (const child of children) {
        result.push({ folder: child, depth });
        walk(child._id, depth + 1);
      }
    };
    walk(null, 0);
    return result;
  });

  public loading = signal<boolean>(false);
  public uploading = signal<boolean>(false);
  public isDragging = signal<boolean>(false);

  public viewMode = signal<'grid' | 'list'>('grid');

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

  public allOnPageSelected = computed(() => {
    const page = this.paginatedItems();
    return page.length > 0 && page.every(i => this.selectedIds().has(i._id));
  });

  public previewUsage = signal<{ _id: string, title: string }[] | null>(null);
  public loadingUsage = signal<boolean>(false);

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

  public totalPages = computed(() => Math.max(1, Math.ceil(this.items().length / this.itemsPerPage())));
  public pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  public paginatedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.items().slice(start, start + this.itemsPerPage());
  });

  ngOnInit(): void {
    this.loadFolders();
    this.loadMedia();
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousemove', this.onMarqueeMove);
    document.removeEventListener('mouseup', this.onMarqueeUp);
  }

  // --- loading -------------------------------------------------------------

  loadFolders(): void {
    this.mediaService.listFolders().subscribe({
      next: (res: any) => this.folders.set(res.folders || []),
      error: (err: any) => this.alertService.addError(err)
    });
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
    this.selectedIds.set(ids);
    this.syncUsage();
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

    this.setSelection(new Set([item._id]));
    this.lastClickedId = item._id;
  }

  // --- drag-to-select (marquee), grid view only, admin only -------------------------

  onGridMouseDown(event: MouseEvent): void {
    if (this.pickMode) return;
    const target = event.target as HTMLElement;
    if (target.closest('.media-card')) return; // started on a tile, not the background
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

    if (container && marquee && (marquee.width > 3 || marquee.height > 3)) {
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
    }

    this.marqueeStart = null;
    this.marqueeContainer = null;
    this.marqueeRect.set(null);
    document.removeEventListener('mousemove', this.onMarqueeMove);
    document.removeEventListener('mouseup', this.onMarqueeUp);
  };

  // --- toolbar actions on the current selection (admin only) -------------------------

  deleteSelected(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    const isSingle = ids.length === 1;
    const singleItem = isSingle ? this.items().find(i => i._id === ids[0]) : null;

    Swal.fire({
      title: isSingle
        ? $localize`:@@mediaDeleteConfirmTitle:¿Eliminar esta imagen?`
        : $localize`:@@mediaBulkDeleteConfirmTitle:¿Eliminar las imágenes seleccionadas?`,
      text: isSingle ? singleItem?.originalName : `${ids.length}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: $localize`:@@delete:Eliminar`,
      cancelButtonText: $localize`:@@cancel:Cancelar`
    }).then((result) => {
      if (!result.isConfirmed) return;
      forkJoin(ids.map(id => this.mediaService.remove(id))).subscribe({
        next: () => {
          this.items.update(list => list.filter(m => !ids.includes(m._id)));
          this.clearSelection();
          if (this.currentPage() > this.totalPages()) {
            this.setPage(this.totalPages());
          }
        },
        error: (err: any) => this.alertService.addError(err)
      });
    });
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
      },
      error: (err: any) => this.alertService.addError(err)
    });
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
