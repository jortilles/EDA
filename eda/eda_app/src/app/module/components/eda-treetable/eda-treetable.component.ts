import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common'; // Necesario para las directivas

// Módulos para el Treetable
import { TreeNode } from 'primeng/api';
import { TreeTableModule  } from 'primeng/treetable';

// Constante personalizada
import { FATHER_ID } from './../../../config/personalitzacio/customizables'

interface Column {
    field: string;
    header: string;
}

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

  public filterBy: string = $localize`:@@filterByTreetable:Filtro: `;

  // Para la tabla árbol dinámica
  dynamicFiles!: TreeNode[];
  dynamicCols!: Column[];
  isDynamic: Boolean = false; // Pregunta si se utiliza la tabla dinámica

  constructor() { }

  ngOnInit(): void {
    const col1 = this.inject.query[0];
    const col2 = this.inject.query[1];

    if(col1.column_type === 'numeric' && col2.column_type === 'numeric') {
      this.isDynamic = false;
      this.initBasicTreeTable()
    } else {
      this.isDynamic = true;
      this.initDynamicTreeTable()
    }

  }

  initBasicTreeTable() {
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
    this.buildHierarchyTreetable(this.labelsInputs, this.inject.data.values).then( (files: any) => {
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
        map[node[`${this.id_label}`]] = { 
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

  initDynamicTreeTable() {

    let data: any;
    let labelsDisplay = this.inject.query.map((c: any) => c.display_name.default); 

    data = {
      labels: labelsDisplay,
      values: this.inject.data.values,
    }

    this.dynamicFiles = this.buildDynamicHierarchyTreetable(data);
  }


  buildDynamicHierarchyTreetable(data: { labels: string[], values: any[][] }) {

    const { labels, values } = data;

    // Convert rows into array of objects
    const rows = values.map(row => {
      const obj: { [key: string]: any } = {};
      labels.forEach((label, i) => {
        obj[label] = row[i];
      });
      return obj;
    });

    // Determinamos unicos para cada label
    const isUniqueLabel: { [key: string]: boolean } = {};
    labels.forEach(label => {
      const seen = new Set();
      rows.forEach(row => seen.add(row[label]));
      isUniqueLabel[label] = seen.size === rows.length;
    });

    // Grouping levels (non-unique labels in order)
    let hierarchyLabels = labels.filter(label => !isUniqueLabel[label]);

    // Leaf level: use only unique labels
    let leafLabels = labels.filter(label => isUniqueLabel[label]);


    if(this.inject.config.config.editedTreeTable) {
      hierarchyLabels = this.inject.config.config.hierarchyLabels;
      leafLabels = this.inject.config.config.leafLabels;
    } else {
      this.inject.config.config.hierarchyLabels = hierarchyLabels;
      this.inject.config.config.leafLabels = leafLabels;
    }


    // Información de los labels con las columnas de valores únicos
    this.dynamicCols = leafLabels.map(item => {
        return { field: item.toLowerCase(), header: item}
    })

    // Recursive tree builder
    function buildLevel(entries: any[], level: number): any[] {
      if (level >= hierarchyLabels.length) {
        return entries.map(entry => {
          const leaf: any = {};
          leafLabels.forEach(label => {
            leaf[label.toLowerCase()] = entry[label];
          });
          return { data: leaf };
        });
      }

      const currentLabel = hierarchyLabels[level];
      const grouped: { [key: string]: any[] } = {};

      for (const entry of entries) {
        const key = entry[currentLabel];
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(entry);
      }

      return Object.keys(grouped).map(groupValue => ({
        data: {
          [leafLabels[0]?.toLowerCase()]: `<b>${currentLabel}</b>: ${groupValue}`
        },
        children: buildLevel(grouped[groupValue], level + 1)
      }));
    }

    return buildLevel(rows, 0);
  }

}
