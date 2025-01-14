import { Component, Input, Output, OnChanges, SimpleChanges, EventEmitter } from '@angular/core';
import { CdkDrag, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';


@Component({
  selector: 'drag-drop',
  templateUrl: './drag-drop.component.html',
  styleUrls: ['./drag-drop.component.css']
})
export class DragDropComponent implements OnChanges {

  
  @Input() axes?:any[];
  @Output() newAxes: EventEmitter<any[]> = new EventEmitter();
  
  public messageItemCrosstable: string = $localize`:@@messageItemCrosstable:Este eje debe contener al menos un elemento`;

  newAxesOrdering = [];
  itemX = [];
  itemY = [];
  itemZ = [];
  validated: boolean = false;

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    this.initialization();
  }
  
  initialization() {

    // Se crea una copia para no modificar el this.axes del EBP
    const copiaAxes = JSON.parse(JSON.stringify(this.axes));

    this.itemX = copiaAxes[0].itemX;
    this.itemY = copiaAxes[0].itemY;
    this.itemZ = copiaAxes[0].itemZ;
    
    this.validated = true;
  }

  public ordering() {
    this.validated = (this.itemX.length>=1 && this.itemY.length>=1 && this.itemZ.length>=1) ? true : false;  

    if(this.validated) {
      this.newAxesOrdering = [{itemX: this.itemX, itemY: this.itemY, itemZ: this.itemZ}]
    }
  }

  temporalExecution(){
    this.newAxesOrdering = [{itemX: this.itemX, itemY: this.itemY, itemZ: this.itemZ}];
    this.newAxes.emit(this.newAxesOrdering);
  }

  // Pasar items de un contenido a otro
  drop(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      this.ordering();
    }
  }

  isNumeric(item: CdkDrag<any>) {
    const data = item.dropContainer.data;
    const value = item.element.nativeElement.innerText.toString();
    if(data.filter((e:any) => e.description==value)[0].column_type!=='numeric') return false;
    return true;
  }


}
