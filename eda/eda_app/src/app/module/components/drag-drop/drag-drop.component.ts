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
  
  public messageItemX: string = $localize`:@@messageItemX:Arrastre aquí los campos para el eje vertical de la tabla cruzada`;
  public messageItemY: string = $localize`:@@messageItemY:Arrastre aquí los campos para el eje horizontal de la tabla cruzada`;
  public messageItemZ: string = $localize`:@@messageItemZ:Arrastre aquí solo los campos numéricos (num) de la tabla cruzada (La suma es la agregación por defecto)`;

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
    this.itemX = this.axes[0].itemX;
    this.itemY = this.axes[0].itemY;
    this.itemZ = this.axes[0].itemZ;
    
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
