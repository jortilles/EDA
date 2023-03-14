
/**
 * CONFIGURACIÓ DELS GRÀCIS QUE HI HAN INLINE A LA TAULA CREUADA
 * 
 */
export const  EdaColumnChartOptions =  {
        showLines: true,
        spanGaps: true,
        responsive: true,
        maintainAspectRatio: true,

        scales: {
            x: {
                display: false
            },
            y: {
                display: false
            },
        },
        elements: {
            point: { radius: 0, hitRadius: 1, hoverRadius: 1, hoverBorderWidth: 1, pointStyle: 'circle' },
            line: { borderWidth: 2, fill: false, tension: 0.3 }
        },
        plugins: {
            legend: {
                display: false
            },
            /** configuraicó del datalabel. */
           datalabels:  { display: false }
           
       },
    }