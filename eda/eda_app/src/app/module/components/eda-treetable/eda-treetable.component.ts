import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common'; // Necesario para las directivas

// Módulos para el Treetable
import { TreeNode } from 'primeng/api';
import { TreeTableModule  } from 'primeng/treetable';

// Constante personalizada
import { FATHER_ID } from './../../../config/personalitzacio/customizables'

@Component({
  selector: 'app-eda-treetable',
  templateUrl: './eda-treetable.component.html',
  styleUrls: ['./eda-treetable.component.css'],
  standalone: true, // Un componente Standalone, indica que no necesita ser declarado en los módulos
  imports: [CommonModule, TreeTableModule],
})
export class EdaTreeTable implements OnInit {

  @Input() inject: any; // El inject contiene dos arreglos => (labels y values)
  files!: TreeNode[];
  labels: any[] = [];
  labelsInputs: any[] = [];
  filterMode = 'lenient'; // Modo indulgente activado, activar botones para opciones de modos => indulgente / estricto

  id_label: string = '';

  public filterBy: string = $localize`:@@filterByTreetable:Filtrar por`;

  constructor() { }

  ngOnInit(): void {

    // Recolección de las etiquetas titulo para el Treetable
    this.inject.query.slice(2).forEach((e: any) => {
      this.labels.push(e.display_name.default)
    })

    this.inject.query.forEach((e: any) => {
      this.labelsInputs.push(e.display_name.default)
    })


    // Obtención de la primera etiqueta de los labels como id genérico
    this.id_label = this.labelsInputs[0];

    // Construcción del objeto necesario para el Treetable
    this.buildHierarchyTreetable(this.inject.labels, this.inject.values).then( (files: any) => {
      this.files = files;
    } )
  }

  // Función que brinda la lógica de ordenamiento
  buildHierarchyTreetable(labels: string[], values: any[]) {
    const map: { [key: number]: any } = {};

    // Primero, construir el mapa de nodos
    values.forEach(item => {
        const node: { [key: string]: any } = {}; // Crear un nodo con claves dinámicas

        // Asignar dinámicamente las propiedades usando los labels
        labels.forEach((label, index) => {
            node[label] = item[index]; // Asignamos los valores de `values` a las propiedades definidas por `labels`
        });

        // Almacenar el nodo en el mapa usando el ID como clave
        map[node.id] = { 
            data: node,  // El objeto `data` es dinámico, contiene las propiedades del nodo
            children: []  // Inicializamos la lista de hijos vacía
        };
    });

    // Ahora, construir la jerarquía asignando los hijos a sus padres
    const result: any[] = [];

    values.forEach(item => {
        const currentItem = map[item[0]]; // Nodo actual
        const parentId = item[1]; // ID del padre

        // Nodo raíz empieza con FATHER_ID (constante de valor 0)
        if (parentId === FATHER_ID) {
            result.push(currentItem);
        } else if (map[parentId]) {
            map[parentId].children.push(currentItem); // Añadir al padre
        }
    });

    return Promise.resolve(result); // Promesa enviada para esperar gran cantidad de datos
  }

}
