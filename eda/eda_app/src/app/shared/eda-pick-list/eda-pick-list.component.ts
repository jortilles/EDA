import { Component, Input, Output, EventEmitter, computed, signal, input } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"

export interface PickListItem {
  id: string
  label: string
  value: any
  description?: string
}

export interface PickListConfig {
  title?: string
  searchPlaceholder?: string
  height?: string
  maxSelectedDisplay?: number
}


@Component({
  selector: "eda-pick-list",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './eda-pick-list.component.html'
})
export class EdaPickListComponent {
  // @Input() availableItems: PickListItem[] = []
  readonly availableItems = input<PickListItem[]>();
  @Input() selectedItems = signal<PickListItem[]>([])
  @Input() config: PickListConfig = {}
  @Output() selectionChange = new EventEmitter<PickListItem[]>()

  searchTerm = signal("")
  maxSelectedDisplay = this.config.maxSelectedDisplay || 10

  // Computed values
  selectedIds = computed(() => new Set(this.selectedItems().map((item) => item.id)))

  filteredItems = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const items = this.availableItems();
    return items.filter(
      (item) => item.label.toLowerCase().includes(search) || item.description?.toLowerCase().includes(search) || false,
    )
  })

  displayedSelectedItems = computed(() => this.selectedItems().slice(0, this.maxSelectedDisplay))

  toggleSelection(item: PickListItem): void {
    const currentSelected = this.selectedItems()
    let newSelected: PickListItem[]

    if (this.isSelected(item.id)) {
      newSelected = currentSelected.filter((selected) => selected.id !== item.id)
    } else {
      newSelected = [...currentSelected, item]
    }

    this.selectedItems.set(newSelected)
    this.selectionChange.emit(newSelected)
  }

  removeSelected(itemId: string): void {
    const newSelected = this.selectedItems().filter((item) => item.id !== itemId)
    this.selectedItems.set(newSelected)
    this.selectionChange.emit(newSelected)
  }

  clearAll(): void {
    this.selectedItems.set([])
    this.selectionChange.emit([])
  }

  isSelected(itemId: string): boolean {
    return this.selectedIds().has(itemId)
  }

  getItemClasses(item: PickListItem): string {
    const baseClasses = "p-3 rounded-md cursor-pointer transition-all duration-200 border "
    const selectedClasses = "bg-blue-50 border-blue-200 hover:bg-blue-100"
    const unselectedClasses = "border-transparent hover:bg-gray-50"

    return baseClasses + (this.isSelected(item.id) ? selectedClasses : unselectedClasses)
  }

  trackByItemId(index: number, item: PickListItem): string {
    return item.id
  }
}
