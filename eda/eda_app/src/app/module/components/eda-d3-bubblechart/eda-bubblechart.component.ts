import {
  Component,
  Input,
  AfterViewInit,
  ElementRef,
  ViewChild,
  OnInit,
  Output,
  EventEmitter
} from '@angular/core'
import * as d3 from 'd3'
import { EdaBubblechart } from './eda-bubblechart'
import { ChartsColors } from '@eda/configs/index'
import * as _ from 'lodash';
import * as dataUtils from '../../../services/utils/transform-data-utils';
import { ChartUtilsService } from '@eda/services/service.index';

@Component({
  selector: 'eda-bubblechart',
  templateUrl: './eda-bubblechart.component.html',
  styleUrls: ['./eda-bubblechart.component.css']
})
export class EdaBubblechartComponent implements AfterViewInit, OnInit {
  @Input() inject: EdaBubblechart
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();

  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef

  div = null;

  id: string;
  svg: any;
  data: any;
  colors: Array<string>;
  assignedColors: any[];
  firstColLabels: Array<string>;
  metricIndex: number;
  width: number;
  heigth: number;
  event: any;
  d: any;
  value: any;
  simulation: any;


  constructor(private chartUtilService : ChartUtilsService) { }

  ngOnInit(): void {
    this.id = `bubblechart_${this.inject.id}`

    this.metricIndex = this.inject.dataDescription.numericColumns[0].index;
    const firstNonNumericColIndex = this.inject.dataDescription.otherColumns[0].index;
    this.firstColLabels = this.inject.data.values.map(row => row[firstNonNumericColIndex]);
    this.firstColLabels = [...new Set(this.firstColLabels)];

    this.data = this.formatData(this.inject.data);

    this.colors = this.inject.colors.length > 0 ? this.inject.colors
      : this.getColors(this.data.children.length, ChartsColors);
    this.assignedColors = this.inject.assignedColors || []; 

  }

  ngOnDestroy(): void {
    if (this.div)
      this.div.remove();
  }

  getColors(dataLength, colors) {

    const colorsLength = colors.length;
    let outputColors: Array<any> = colors;

    if (dataLength > colorsLength) {
      let repeat = Math.ceil(dataLength / colorsLength);

      for (let i = 0; i < repeat - 1; i++) {
        outputColors = [...outputColors, ...colors]
      }
    }

    return outputColors.filter((_, index) => index < dataLength).map(color => `rgb(${color[0]}, ${color[1]}, ${color[2]} )`);

  }



  ngAfterViewInit() {

    if (this.svg) this.svg.remove();
    let id = `#${this.id}`;
    this.svg = d3.select(id);
    if (this.svg._groups[0][0] !== null && this.svgContainer.nativeElement.clientHeight > 0) {
      this.draw();
    }

  }

  private getToolTipData = (data) => {

    let label = this.inject.dataDescription.otherColumns[this.inject.dataDescription.otherColumns.length - 1];
    label = label.name;
    const firstRow = `${label} : ${data.data.name}`;

    let metricLabel = this.inject.dataDescription.numericColumns[0].name;
    const secondRow = `${metricLabel} : ${data.data.value.toLocaleString('de-DE', { maximumFractionDigits: 6 })}`;

    const thirdRow = this.inject.linkedDashboard ? `Linked to ${this.inject.linkedDashboard.dashboardName}` : '';

    const maxLength = dataUtils.maxLengthElement([firstRow.length, secondRow.length, thirdRow.length * (18 / 12)]);

    const pixelWithRate = 8;
    const width = maxLength * pixelWithRate;

    return { firstRow: firstRow, secondRow: secondRow, thirdRow: thirdRow, width: width }
  }


  private randomID() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }

  draw() {


    // dibujamos márgenes y color
    const width = this.svgContainer.nativeElement.clientWidth - 10, height = this.svgContainer.nativeElement.clientHeight - 10;
    
    //Funcion de ordenación de colores de D3
    const valuesBubble = this.assignedColors.map((item) => item.value);
    const colorsBubble = this.assignedColors[0].color ? this.assignedColors.map(item => item.color) : this.colors;
    const color = d3.scaleOrdinal(this.firstColLabels,  colorsBubble).unknown("#ccc");

    //llamamos a la libreria de los circulos
    const treemap = data => d3.pack()
      .size([width, height])
      .padding(1)
      (d3.hierarchy(data)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value))


    //asignamos un valor que es la libreria con los datos 
    const root = treemap(this.data);
    //llamamos al panel
    const svg = this.svg;

    // Definimos las condiciones y su correspondiente tamaño mininmo y maximo de los circulos y su texto en funcion de la altura del area SVG

    // TO-DO!!!!  --------------> REVISAR METODO!!!!! -------> TO-DO!!!! 
    var min;
    var max;
    var minText;
    var maxText;

    if (height <= 220) { min = 5, max = 58, minText = 2, maxText = 10 }
    else if (height <= 251) { min = 7, max = 38, minText = 3, maxText = 10.5 }
    else if (height <= 277) { min = 10, max = 48, minText = 3.5, maxText = 11 }
    else if (height <= 309) { min = 12, max = 58, minText = 4, maxText = 11.5 }
    else if (height <= 344) { min = 14, max = 68, minText = 5, maxText = 15 }
    else if (height <= 402) { min = 16, max = 78, minText = 6, maxText = 21 }
    else if (height <= 463) { min = 18, max = 118, minText = 7, maxText = 21 }
    else { min = 20, max = 128, minText = 8, maxText = 21 }


    // Tamaño y escala del dato/circulo
    const size = d3.scaleLinear()
      //Los algoritmos que estan colocados en el .domain sirven para devolver el valor numerico minimo y maximo de cada circulo
      .domain([Math.min.apply(Math, this.data.children.map(function (i) { return i.value })), Math.max.apply(Math, this.data.children.map(function (i) { return i.value }))])
      .range([min, max])  // El circulo medirá en px entre el valor de la variable min y la variable max

    // Tamaño y escala del texto de los paises
    const textSize = d3.scaleLinear()
      //Los algoritmos que estan colocados en el .domain sirven para devolver el valor numerico minimo y maximo de cada circulo
      .domain([Math.min.apply(Math, this.data.children.map(function (i) { return i.value })), Math.max.apply(Math, this.data.children.map(function (i) { return i.value }))])
      .range([minText, maxText])  // El texto medirá en px entre el valor de la variable minText y la variable maxText

    //Crea una variable que hace que la constante svg seleccione todas las etiquetas "g"
    var leaf = svg.selectAll("g")
      //recoge todos los datos
      .data(root.leaves())

    /*Crea y coloca los "bloques" que contienen los circulos y su texto */
    var elemEnter = leaf.enter()
      .append("g")

    //Crea dentro del "bloque g" el circulo
    var node = elemEnter.append("circle")
      .attr("id", d => (d.leafUid = this.randomID())) //Crea y assigna una id al azar a cada circulo
      .attr("fill", d => {
        while (d.depth > 1) d = d.parent;
        //Devolvemos SOLO EL COLOR de assignedColors que comparte la data y colors de assignedColors
        return  colorsBubble[valuesBubble.findIndex((item) => d.data.name.includes(item))] || color(d.data.name);
      })
      .attr("class", "node")
      .attr("r", function (d) {
        return size(d.value)
      })//La funcion size recoge el valor numerico asignado del circulo y posteriormente le asigna su diametro

      .style("fill-opacity", 1)
      .attr("stroke", "black")
      .style("stroke-width", 1)
      .on('click', (mouseevent, data) => {
        if (this.inject.linkedDashboard) {
          const props = this.inject.linkedDashboard;
          const value = data.data.name;
          const url =
            window.location.href.slice(
              0,
              window.location.href.indexOf("/dashboard")
            ) +
            `/dashboard/${props.dashboardID}?${props.table}.${props.col}=${value}`;
          window.open(url, "_blank");
        } else {
          //Passem aquestes dades
          const label = data.data.name;
          const filterBy = this.inject.data.labels[this.inject.data.values[0].findIndex((element) => typeof element === 'string')]
          this.onClick.emit({label, filterBy });
        }
      })
              .on('mouseover', (d, data) => { 
                

                //Se aumenta el tamaño del contorno de la burbuja
                //TO-DO ------------> HACER QUE EL CONTORNO SEA POR BURBUJA EN VEZ DEL TOTAL DE BURBUJAS
                node 
                  .transition()
                  .duration(200)
                  .style("stroke-width", 3);
                
                // Se crea una etiqueta que contenga los datos de cada burbuja
                const tooltipData = this.getToolTipData(data);
                let text = `${tooltipData.firstRow} <br/> ${tooltipData.secondRow}`;
                text = this.inject.linkedDashboard ? text + `<br/> <h6>  ${tooltipData.thirdRow} </h6>` : text;

                //Se crea la etiqueta tooltipData con div
                this.div = d3.select("app-root").append('div')
                  .attr('class', 'd3tooltip')
                  .style('opacity', 0);

                this.div.transition()
                  .duration(200)
                  .style('opacity', .9);
                this.div.html(text)
                  .style('left', (d.pageX - 81) + 'px')
                  .style('top', (d.pageY - 49) + 'px')
                  .style('width', `${tooltipData.width}px`)
                  .style('height', 'auto');
              })
      .on('mouseout', (d) => {

        //Se reduce el contorno de la burbuja a su tamaño original
        node
          .transition()
          .duration(200)

          .style("stroke-width", 1);

        //Se borra la etiqueta tooltipData
        this.div.remove()
      })
      .on("mousemove", (d, data) => {
        //Actualiza la posicion de la etiqueta tooltipData
        const linked = this.inject.linkedDashboard ? 0 : 10;
        const tooltipData = this.getToolTipData(data);

        this.div.style("top", (d.pageY - 70 + linked) + "px")
          .style("left", (d.pageX - tooltipData.width / 2) + "px");
      }).call(d3.drag() // Llama a una funcion especifica cuando el nodo es arrastrado
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))

    //crea y coloca dentro del "bloque g" un "bloque" de texto
    elemEnter.append("text")
      .attr("font-size", function (d) {
        return textSize(d.value) //La funcion textSize recoge el valor numerico asignado del circulo y posteriormente le asigna el tamaño del texto
      })
      //Se crea y coloca la etiqueta tspan dentro del bloque de texto, eso hace que el texto este dividido en letras y cada tspan es una letra o espacio
      .selectAll("tspan")
      //Antes de crear y colocar el texto se debe analizar que diametro tiene el circulo al que se va colocar y cuantas letras contiene dicho texto para posteriormente recortarlo
      .data(d => {
        if (d.r >= 100 && d.r <= 150 && d.data.name.trim().length >= 17) {
          return d.data.name.substr(0, 10) + '...';
        }

        else if (d.r >= 80 && d.r <= 100 && d.data.name.trim().length >= 10) {
          return d.data.name.substr(0, 8) + '...';
        }

        else if (d.r >= 60 && d.r <= 80 && d.data.name.trim().length >= 10) {
          return d.data.name.substr(0, 6) + '...';
        }

        else if (d.r >= 0 && d.r <= 60 && d.data.name.trim().length >= 8) {
          return d.data.name.substr(0, 6) + '...';
        }

        else {
          return d.data.name;
        }
      })

      .join("tspan") //Aqui se junta todos los tspan dentro del "bloque texto" para evitar que las letras esten desperdigadas por todo el area SVG     
      .style("font-family", "var(--panel-font-family)")
      .style("pointer-events", "none")
      .attr("fill", "white")      
      .attr("fill-opacity", (d, i, nodes) => i === nodes.length - 1 ? 0.9 : null)
      .text(d => d)//Cargamos el texto dentro del "bloque" tspan



    // Caracteristicas de las fisicas aplicadas en los nodos:
    const simulation = d3.forceSimulation()
      .force("x", d3.forceX().x(width / 2))
      .force("y", d3.forceY().y(height / 2))
      .force("center", d3.forceCenter().x(width / 2).y(height / 2)) // Atraccion de los nodos hacia el centro del area SVG
      .force("charge", d3.forceManyBody().strength(.1)) // Los nodos tiene atraccion entre ellos cuando el valor es > 0
      //En el .radius dentro de function es OBLIGATORIO que la variable desde donde se extrae los datos del circulo en este caso este definido como (d: any) ya que sino llamara a una variable de la libreria d3js y dara error
      .force("collide", d3.forceCollide().strength(.2).radius(function (d: any) {

        return (size(d.value) + 3)
      }).iterations(1)) // Fuerza que evita la superposicion de los nodos 

    //TO-DO --------------------> LA SUPERPOSICIÓN DE LAS BOLAS PEQUEÑAS SOBRE LAS GRANDES EN ARRASTRE


    // Aplica estas fuerzas a los nodos y se actualiza sus posiciones. 
    // Una vez el algoritmo ".force" esta contento con sus posiciones (el valor 'alfa' es suficientemente bajo), las simulaciones se detienen.
    simulation
      .nodes(root.leaves())
      .on("tick", function () {
        node
          .attr("cx", d => d.x)
          .attr("cy", d => d.y)


        //Aquí definimos el texto en el centro de la bola
        elemEnter.select("tspan") // Se selecciona las etiquetas tspan que estan dentro del "bloque" texto
          .attr("x", d => d.x)
          .style("text-anchor", "middle")//Centra el texto dentro del circulo
          .attr("y", d => d.y)
      });

    // ¿Qué sucede cuando se arrastra un círculo?
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(.03).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(.03);
      d.fx = null;
      d.fy = null;
    }

  }

  formatData(data) {

    let rootNode = new Map();

    /**Numeric value at end */
    const newData = [];
    data.values.forEach(row => {

      let newRow = [];
      let numericValue = row.splice(this.metricIndex, 1)[0];
      newRow = [...row];
      //Replace nulls by   Null strings
      for (let e = 0; e < newRow.length; e++) {
        if (newRow[e] === null) {
          newRow[e] = 'Null';
        }
      }
      newRow.push(numericValue);
      row.splice(this.metricIndex, 0, numericValue);
      newData.push(newRow);

    });



    newData.forEach(r => {

      if (!r.includes(null)) {
        const row = _.cloneDeep(r);
        rootNode = this.buildTree(row, rootNode);
      }

    });

    const formatedData = { name: 'rootNode', children: [] };

    rootNode.forEach((value, key) => {
      if (typeof value === 'number') {

        formatedData.children.push({ name: key, value: value });

      } else {
        formatedData.children.push({ name: key, children: this.unnest(value) });
      }
    });
    return formatedData;



  }


  buildTree(values: Array<any>, node: Map<string, any>) {

    let value = values[0];

    if (values.length <= 2) {
      node.set(value, values[1]);
      return node;
    } else {

      if (!node.has(value)) node.set(value, new Map());
      values.shift();
      const newNode = node.get(value);
      node.set(value, this.buildTree(values, newNode));

    }
    return node;
  }


  unnest(node: Map<string, any>) {

    const values = [];
    node.forEach((value, name) => {
      if (typeof value === 'number') {
        values.push({ name: name, value: value });
      } else {
        values.push({ name: name, children: this.unnest(value) })
      }
    })
    return values;
  }


}
