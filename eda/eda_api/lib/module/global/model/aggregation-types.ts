export class AggregationTypes {
        static getValues(){
                return   [
                        { value: 'sum', display_name: 'Suma' },
                        { value: 'avg', display_name: 'Media' },
                        { value: 'max', display_name: 'Máximo' },
                        { value: 'min', display_name: 'Mínimo' },
                        { value: 'count', display_name: 'Cuenta Valores' },
                        { value: 'count_distinct', display_name: 'Valores Distintos' },
                        { value: 'none', display_name: 'No' }
                   ];
        }
}


