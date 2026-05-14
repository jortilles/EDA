// Personalización de colores corporativos
export const CORPORATE_COLORS = {
    // Colores base de marca — usados en toda la aplicación
    primary:         '#E11D48',      // Color principal (botones, iconos, gradientes)
    primaryGradient: '#FB7185',      // Extremo final de gradientes (header chat, FAB, burbujas)
    primaryRgb:      '225, 29, 72',  // Valor RGB del primario para opacidades (box-shadow, rgba)
    primaryHsl:      '347 91% 50%',  // Componentes HSL del primario para --ring (Tailwind focus ring)

    // Colores específicos del chatbot
    chat: {
        avatarBg:       '#ffe4e6',   // Fondo del avatar del robot (header y mensajes)
        avatarBgAlt:    '#fecdd3',   // Fondo alternativo del avatar (gradiente empty state)
        avatarBorder:   '#fda4af',   // Borde del avatar y cabecera de tabla
        surfaceHover:   '#fff1f2',   // Fondo hover en sugerencias y filas de tabla
        tableHeader:    '#be123c',   // Color del texto en cabeceras de tabla
        linkColor:      '#e11d48',   // Color de enlaces en mensajes
        linkHoverColor: '#9f1239',   // Color de enlaces al hacer hover
    },

    // Colores específicos de carpetas (home — vista de carpetas y filtros de tags)
    folder: {
        iconBg:          '#ffe4e6',  // Fondo del icono de carpeta cerrada
        iconBgHover:     '#fecdd3',  // Fondo del icono de carpeta hover o abierta
        iconColor:       '#e11d48',  // Color del icono de carpeta cerrada
        borderHover:     '#fb7185',  // Borde de la tarjeta carpeta al hacer hover o al estar abierta
        iconColorHover:  '#be123c',  // Color del icono y texto al hacer hover o al estar abierta
        cardBgOpen:      '#fff1f2',  // Fondo de la tarjeta cuando la carpeta está abierta
        labelColorOpen:  '#9f1239',  // Color del nombre de la carpeta cuando está abierta
    },

    // Colores de botones de acción en diálogos
    buttons: {
        // Confirmar: acción principal afirmativa
        confirmBg:        '#00B0BA',  // Inicio gradiente (rose-600)
        confirmBgEnd:     '#00c9b1',  // Fin gradiente (rose-400)
        confirmHoverBg:   '#006c72',  // Hover inicio (rose-800, más oscuro)
        confirmHoverBgEnd:'#05a592',  // Hover fin (rose-700, más oscuro)

        // Auxiliar: acción secundaria (ejecutar consulta, abrir SQL, previsualizar…)
        auxBg:            '#1D4ED8',  // Inicio gradiente (blue-700)
        auxBgEnd:         '#3B82F6',  // Fin gradiente (blue-500)
        auxHoverBg:       '#1E40AF',  // Hover inicio (blue-800)
        auxHoverBgEnd:    '#2563EB',  // Hover fin (blue-600)

        // Cancelar: acción de descarte
        cancelBg:         '#df4040',  // Inicio gradiente (red-400, más claro)
        cancelBgEnd:      '#ec2828',  // Fin gradiente (red-300, más claro)
        cancelHoverBg:    'rgb(177, 39, 39)',  // Hover inicio (red-500, más oscuro)
        cancelHoverBgEnd: '#bd3636',  // Hover fin (red-400, más oscuro)
    },
};

export const ChartsPalettes = [
    {
        paleta: [
            '#10B4BD',
            '#3C88CA',
            '#685CD9',
            '#8B5DD2',
            '#A36AC7',
            '#BB78BD',
            '#D285B3',
            '#EA93A9',
            '#F7A68E',
            '#FCB37A',
            '#FDB0BA',
            '#FBBFA6',
            '#F9C98F',
            '#F6D278',
            '#ECE45A'
        ], 
        name: 'Gradiente'
    },
    {
        paleta: [
  '#6ECBD3', // cian suave
  '#C59BEF', // lavanda
  '#DCEB8E', // verde pastel claro
  '#F2B98E', // melocotón suave
  '#E4C7F5', // lila claro
  '#79BDEB', // azul cielo
  '#E89BCB', // rosa suave
  '#A8E6C1', // verde menta
  '#879CEB', // azul lavanda
  '#F2CF8C', // amarillo suave
  '#7EDBD1', // turquesa claro
  '#F29C9C', // coral pastel
  '#C6E88E', // verde lima suave
  '#9C8EEB', // violeta suave
  '#8FD8F2', // azul hielo
  '#F2A8D8', // rosa empolvado
  '#C3B6F2', // malva claro
  '#B8EED1', // verde agua
  '#F4C7A1', // albaricoque
  '#8FE3D0', // menta azulada
  '#D9F0A3', // pistacho claro
  '#F5B8E4', // rosa claro
  '#A8E1F2', // celeste pastel
  '#F4DA8E', // amarillo mantequilla
  '#B19CF2'  // violeta claro final
        ]
        , name: 'Contraste'
    }, {
        paleta: [
            '#5C86A6', '#F7DB86', '#69C8BC', '#A66B5C', '#8FE7ED',
            '#FFB56B', '#8C8C8C', '#CDE67D', '#D7B28E', '#74BFC3',
            '#050504', '#F2A7A3', '#7FC4A7', '#FFD1A0', '#73A7C6',
            '#B8A0F2', '#7BE2CF', '#F2A0EE', '#8EE0A6', '#FFB1C0',
            '#A8CCFF', '#FFB08A', '#C3CEDD', '#C7E87D', '#FFD59A'
        ]
        , name: 'Nocturna'
    },
    {
        paleta: [
            '#7FEFD1', '#6FE3D6', '#7AD3E0', '#8BC6EA', '#9ABCF3',
            '#7AA6D9', '#5D86C9', '#476CB8', '#3353A6','#2A4A90',
             '#1F3F7A', '#162F5E', '#0F223F', '#0B1A2B','#2C2C2C',
             '#6C7A7C', '#8A989A', '#A7B3B5', '#C3CCCD', '#D6DEDF',
            '#E6EFF0', '#B9E7E4', '#A4D8DF', '#93C6D1'
        ]
        , name: 'Menta'
    },
    {
        paleta: [
  '#025F8F',
  '#027BB0',
  '#0296D1',
  '#0C9BD3',
  '#169FD5',
  '#20A4D7',
  '#2AA8D9',
  '#34ADDB',
  '#3EB1DD',
  '#48B6DF',
  '#52BAE1',
  '#5CBFE3',
  '#66C3E5',
  '#70C8E7',
  '#7ACCE9',
  '#84D1EB',
  '#8ED5ED',
  '#98DAEF',
  '#A2DEF0',
  '#ACE3F2',
  '#B6E7F4',
  '#C0ECF6',
  '#CAF0F8'
        ]
        , name: 'Celeste'
    },
    {
        paleta: [
            '#425EEB', '#CA42EB', '#4192EB', '#9342EB', '#5C42EB',
            '#7DD3FC', '#7C3AED', '#60A5FA', '#A855F7', '#2563EB',
            '#C084FC', '#1D4ED8', '#D8B4FE', '#0F172A', '#93C5FD',
            '#4C1D95', '#38BDF8', '#6D28D9', '#E879F9', '#312E81',
            '#A78BFA', '#2DD4BF', '#F0ABFC', '#8DA2FB', '#9E90EB'
        ]
        , name: 'psique'
    },
    {
        paleta: [
            '#425EEB', '#00E5FF', '#CA42EB', '#00FF85', '#FF2BD6',
            '#4192EB', '#FFB000', '#9342EB', '#FF3D00', '#5C42EB',
            '#00C2FF', '#FF00A8', '#00FFCC', '#7C3AED', '#00FF3C',
            '#2563EB', '#FFD400', '#A855F7', '#FF006E', '#00A8FF',
            '#C084FC', '#00FF9A', '#FF4D8D', '#2D2AFF', '#9E90EB'
        ]
        , name: 'solido'
    },

];

export const LogoImage = 'assets/images/logos/logo.png';

export const LogoSidebar = 'assets/images/logos/logo.png';

export const SubLogoImage = 'assets/images/logos/logo_500.png';

export const BackgroundImage = 'assets/images/background/data-bg.png';

export const Tema = 'default-dark';

export const TemaUrl = 'assets/css/colors/sass/default-dark.css';


export const DEFAULT_BACKGROUND_COLOR: string = '#f1f0f0';
export const DEFAULT_PANEL_COLOR: string = '#ffffff';
export const DEFAULT_FONT_COLOR: string = '#000000'
export const DEFAULT_FONT_FAMILY: string = 'Montserrat';  /* THIS MUST BE SET ALSO IN  \eda_app\src\assets\sass\css\custom.css */
export const DEFAULT_FONT_SIZE: number = 0;
export const DEFAULT_TITLE_ALIGN: string = 'flex-start';
export const DEFAULT_PANEL_TITLE_ALIGN: string = 'flex-start';
export const EMPTY_VALUE: string = ''; // $localize`:@@EmptyValueMessage:Sin Informar` ;// Agregado valores vacios en diferentes idiomas
export const NULL_VALUE: string = '';// null Agregado de null_value en diferentes idiomas  if you want to leave the null you can put this value: LEAVE_THE_NULL . THIS LEAVE_THE_NULL will leave the null value as null
export const DEFAULT_PALETTE_COLOR: any = ChartsPalettes.find(palette => palette.name === "Gradiente");
export const FATHER_ID: number = 0; // Valor id de Padre para el componente Treetable
