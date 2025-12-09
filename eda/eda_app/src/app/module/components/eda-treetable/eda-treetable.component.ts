import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreeNode } from 'primeng/api';
import { TreeTableModule } from 'primeng/treetable';

@Component({
  selector: 'app-eda-treetable',
  standalone: true,
  imports: [CommonModule, TreeTableModule],
  templateUrl: './eda-treetable.component.html',
  styleUrls: ['./eda-treetable.component.css']
})
export class EdaTreeTable implements OnInit {

  @Input() inject: any;
  @Output() onClick = new EventEmitter<any>();

  nodes: TreeNode[] = [];
  leafs: { field: string; header: string }[] = [];

  ngOnInit(): void {
    // Control de errores de la entrada de datos
    if (!this.inject || !Array.isArray(this.inject.query) || !Array.isArray(this.inject.data?.values)) {
      console.error('Inject structure incorrecta. Esperado inject.query[] y inject.data.values[]');
      return;
    }

    this.prepareColumns();
    this.nodes = this.buildTree();
  }

  // Rescatamos la query y conseguimos las columas visibles
  // Solo se mostrarán los campos posteriores a los IDs
  prepareColumns() {
    // rescato columnas después de los IDs
    this.leafs = this.inject.query.slice(2).map(c => ({
      field: c?.name ?? c?.display_name?.default ?? '',
      header: c?.display_name?.default ?? c?.name ?? ''
    }));

  }

  // Construcción jerarquia EXPL ==>
  /*
    **NODE MAP** 
    Primero creamos un mapa que recorre todas las filas que llegan de
    la query, aquí guardamos el IDitem, sus valores y sus hijos vacios []
    
    **ROOTS**
    Segundo creamos el treenode que devolveremos, tiene la misma estructura que 
    FiltrosDependientes, roots --> data con childrens, dentro de childrens --> data con childrens...
     Hay dos casos: cuando el primer ID se comparte con el padre, o cuando no
  */
  buildTree(): TreeNode[] {
      const values: any[][] = this.inject.data.values; // Todas las filas [IDPadre, IDItem, valorN, ...]
      const nodesMap: Record<string, TreeNode> = {}; // Mapa de nodos por su ID.

      // Recorremos todos los valores y guardamos todos los nodos a mostrar sin ids
      values.forEach(row => {
          const dataObj: Record<string, any> = {};
          // Guardamos en dataobj los campos que queremos mostrar en la tabla
          this.inject.query.slice(2).forEach((queryField, idx) => {
              const field = queryField?.name ?? queryField?.display_name?.default ?? '';
              dataObj[field] = row[idx + 2]; // +2 porque los IDs esstan SIEMPRE al inicio
          });

          const key = String(row[1]); //IDItem
          nodesMap[key] = { key, data: dataObj, children: [] };
      });

      // Root es la estructura de la tabla:
      const root: TreeNode[] = [];

      // Moldear y enlazar listado de nodes para tener el treenode
      Object.values(nodesMap).forEach(node => {
          const id = node.key;

          // Buscamos en queryvalue la fila de este nodo y obtenemos el IDPadre
          const parentKey = values.find(r => String(r[1]) === id)?.[0];

          if (parentKey === 0 || parentKey === null) { // su padre es 0 o no tiene ==> root
              root.push(node);
          } else if (parentKey && nodesMap[parentKey]) {// tiene padre y esta en lista ==> child
              nodesMap[parentKey].children.push(node);
          } else { /* tiene padre y no esta en lista ==> huerfano */ }
      });
      return root;
  }

  handleClick(item: any, column: string) {
    this.onClick.emit({ item, column });
  }
}
