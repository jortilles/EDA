export const EbpUtils = {

  getOptionDescription: (value: string): string => {
    let description = $localize`:@@chartInfo1:Los datos seleccionados no permiten utilizar este gráfico.`;
    let str: string; let str2: string;
    switch (value) {
      case 'kpi':
        str = $localize`:@@chartInfo2:Un KPI necesita un único número`;
        description += `\n${str}`;
        break;
      case 'barline':
        str = $localize`:@@chartInfo3:Un gráfico de barras necesita una o más categorías y una série numéricas. Además, si hay mas de una série los datos numéricos deben agregarse.`;
        description += `\n${str}`;
        break;
      case 'stackedbar':
        str = $localize`:@@chartInfo4:\n Un gráfico combinado necesita una categoría y dos séries numéricas`;
        description += `\n${str}`;
        break;
      case 'line':
        str = $localize`:@@chartInfo5:Un gráfico de línea necesita una o más categorías y una série numérica. Además, si hay mas de una série los datos numéricos deben agregarse.`;
        description += `\n${str}`;
        break;
      case 'horizontalBar':
        str = $localize`:@@chartInfo6:Un gráfico de barras necesita una o más categorías y una série numérica. Además, si hay mas de una série los datos numéricos deben agregarse.`;
        description += `\n${str}`;
        break;
      case 'bar':
        str = $localize`:@@chartInfo7:Un gráfico de barras necesita una o más categorías y una série numérica. Además, si hay mas de una série los datos numéricos deben agregarse.`;
        description += `\n${str}`;
        break;
      case 'polarArea':
        str = $localize`:@@chartInfo8:Un gráfico polar necesita una categoría y una série numérica`;
        description += `\n${str}`;
        break;
      case 'doughnut':
        str = $localize`:@@chartInfo9:Un gráfico de pastel necesita una categoría y una série numérica`;
        description += `\n${str}`;
        break;
      case 'crosstable':
        str = $localize`:@@chartInfo10:Una tabla cruzada necesita dos o más categorías y una série numérica`;
        description += `\n${str}`;
        break;
      case 'coordinatesMap':
        str = $localize`:@@chartInfo11:Es necesario que los dos primeros campos sean de tipo coordenada.`;
        str2 = $localize`:@@chartInfo111:Puedes añarir un campo de tipo métrica y uno de tipo etiqueta en este orden o cualquiera de los dos por separado.`;
        description += `\n${str}\n${str2}`;
        break;
      case 'geoJsonMap':
        str = $localize`:@@chartInfo12:Es necesario un campo vinculado a un archivo GeoJson y un campo de tipo numérico.`;
        description += `\n${str}`;
        break;
      case 'parallelSets':
        str = $localize`:@@chartInfo14:Un Parallel Set necesita dos o más categorias y un campo numérico`;
        description += `\n${str}`;
        break;
      case 'treeMap':
        str = $localize`:@@chartInfo15:Un Tree Map necesita un campo numérico y una o más categorias`;
        description += `\n${str}`;
        break;
      case 'scatterPlot':
        str = $localize`:@@chartInfo16:Un Scatter Plot necesita una categoria y dos o tres campos numéricos`;
        description += `\n${str}`;
        break;
      case 'knob':
          str = $localize`:@@chartInfo17:El velocímetro necesita uno o dos valores numéricos, en caso de disponer de dos valores el segundo se interpretará como límite`;
          description += `\n${str}`;
          break;
      default:
        description = $localize`:@@chartInfo13:Los datos seleccionados no permiten utilizar este gráfico.`;
        break;
    }

    return description;
  },

  getOptionIcon: (value: string): string => {
    let description = '';

    switch (value) {
      case 'table':
        description = 'table_chart';
        break
      case 'crosstable':
        description = 'grid_on';
        break
      case 'kpi':
        description = 'attach_money';
        break
      case 'barline':
        description = 'multiline_chart';
        break
      case 'line':
        description = 'timeline';
        break
      case 'horizontalBar':
        description = 'notes';
        break
      case 'bar':
        description = 'bar_chart';
        break
      case 'polarArea':
        description = 'scatter_plot';
        break
      case 'doughnut':
        description = 'pie_chart';
        break
      case 'coordinatesMap':
        description = 'add_location';
        break;
      case 'geoJsonMap':
        description = 'map'
        break;
      case 'parallelSets':
        description = 'tune'
        break;
      case 'treeMap':
        description = 'dashboard'
        break;
      case 'scatterPlot':
        description = 'scatter_plot'
        break;
      case 'knob':
        description = 'explore'
        break;
      case 'sunburst':
        description = 'brightness_high'
        break;
      case 'funnel':
        description = 'filter_alt'
    }

    return description;
  },
  chartType: (type: string): number => {
    if (['table', 'crosstable'].includes(type)) {
      return 0;
    }
    if (['bar', 'line', 'piechart'].includes(type)) {
      return 1;
    }
    if (type === 'kpi') {
      return 3;
    }
    return -1;
  }

}