// Corporate color customization
export const CORPORATE_COLORS = {
    // Colores base de marca — usados en toda la aplicación
    primary:         '#BE0926',      // Color principal (botones, iconos, gradientes)
    primaryGradient: '#E02941',      // Extremo final de gradientes (header chat, FAB, burbujas)
    primaryRgb:      '190, 9, 38',   // Valor RGB del primario para opacidades (box-shadow, rgba)
    primaryHsl:      '350 91% 39%',  // Componentes HSL del primario para --ring (Tailwind focus ring)


    // Chatbot-specific colors
    chat: {
        avatarBg:       '#FBDADE',   // Fondo del avatar del robot (header y mensajes)
        avatarBgAlt:    '#F7A8B3',   // Fondo alternativo del avatar (gradiente empty state)
        avatarBorder:   '#E05060',   // Borde del avatar y cabecera de tabla
        surfaceHover:   '#FCEEF0',   // Fondo hover en sugerencias y filas de tabla
        tableHeader:    '#880618',   // Color del texto en cabeceras de tabla
        linkColor:      '#BE0926',   // Color de enlaces en mensajes
        linkHoverColor: '#9C071B',   // Color de enlaces al hacer hover

    },

    // Folder-specific colors (home — folder view and tag filters)
    folder: {
        iconBg:          '#FBDADE',  // Fondo del icono de carpeta cerrada
        iconBgHover:     '#F7A8B3',  // Fondo del icono de carpeta hover o abierta
        iconColor:       '#BE0926',  // Color del icono de carpeta cerrada
        borderHover:     '#E02941',  // Borde de la tarjeta carpeta al hacer hover o al estar abierta
        iconColorHover:  '#880618',  // Color del icono y texto al hacer hover o al estar abierta
        cardBgOpen:      '#FCEEF0',  // Fondo de la tarjeta cuando la carpeta está abierta
        labelColorOpen:  '#6B0513',  // Color del nombre de la carpeta cuando está abierta

    },

    // Action button colors in dialogs
    buttons: {
        // Confirmar: acción principal afirmativa
        confirmBg:        '#BE0926',  // Inicio gradiente
        confirmBgEnd:     '#BE0926',  // Fin gradiente
        confirmHoverBg:   '#0B0F19',  // Hover inicio
        confirmHoverBgEnd:'#0B0F19',  // Hover fin

        // Auxiliar: acción secundaria (ejecutar consulta, abrir SQL, previsualizar…)
        auxBg:            '#4C82F7',  // Inicio gradiente (blue-700)
        auxBgEnd:         '#4C82F7',  // Fin gradiente (blue-500)
        auxHoverBg:       '#2768F5',  // Hover inicio (blue-800)
        auxHoverBgEnd:    '#2768F5',  // Hover fin (blue-600)

        // Cancelar: acción de descarte
        cancelBg:         '#EFF2FC',  // Inicio gradiente
        cancelBgEnd:      '#EFF2FC',  // Fin gradiente
        cancelHoverBg:    '#BE0926',  // Hover inicio
        cancelHoverBgEnd: '#BE0926',  // Hover fin
        cancelText:       '#33354D',  // Color del texto
        cancelTextHover:  '#FFFFFF',  // Color del texto al hacer hover

        // Boton De Login
        loginBg:         '#FCEFF1',  // Inicio gradiente
        loginBgEnd:      '#FCEFF1',  // Fin gradiente
        loginHoverBg:    '#f8dee2',  // Hover inicio
        loginHoverBgEnd: '#f8dee2',  // Hover fin
        loginText:       '#BE0926',  // Color del texto
        loginTextHover:  '#BE0926',  // Color del texto al hacer hover
        loginBorderColor: '#c2bdbe00', // Borde del color del boton

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
  '#6ECBD3', // soft cyan
  '#C59BEF', // lavender
  '#DCEB8E', // light pastel green
  '#F2B98E', // soft peach
  '#E4C7F5', // light lilac
  '#79BDEB', // sky blue
  '#E89BCB', // soft pink
  '#A8E6C1', // mint green
  '#879CEB', // lavender blue
  '#F2CF8C', // soft yellow
  '#7EDBD1', // light turquoise
  '#F29C9C', // pastel coral
  '#C6E88E', // soft lime green
  '#9C8EEB', // soft violet
  '#8FD8F2', // ice blue
  '#F2A8D8', // dusty rose
  '#C3B6F2', // light mauve
  '#B8EED1', // aqua green
  '#F4C7A1', // apricot
  '#8FE3D0', // bluish mint
  '#D9F0A3', // light pistachio
  '#F5B8E4', // light pink
  '#A8E1F2', // pastel sky blue
  '#F4DA8E', // butter yellow
  '#B19CF2'  // final light violet
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

export const LogoSidebar = 'assets/images/logos/logoDDP.png';

export const SubLogoImage = 'assets/images/logos/logo_500.png';

export const BackgroundImage = 'assets/images/background/data-bg.png';

export const Tema = 'default-dark';

export const TemaUrl = 'assets/css/colors/sass/default-dark.css';


/** Application shell background color (home and admin pages) */
export const DEFAULT_HOME_BACKGROUND_COLOR: string = '#F5F5F5';

export const DEFAULT_BACKGROUND_COLOR: string = '#f1f0f0';
export const DEFAULT_PANEL_COLOR: string = '#ffffff';
export const DEFAULT_FONT_COLOR: string = '#000000'

/** Table header background color (header: high opacity, banding: low opacity) */
export const DEFAULT_TABLE_HEADER_COLOR: string = '#249daa';
export const DEFAULT_TABLE_BANDING_COLOR: string = '#31bece'; // Same color as the header but with reduced opacity for row banding
export const DEFAULT_FONT_FAMILY: string = 'Montserrat';  /* THIS MUST BE SET ALSO IN  \eda_app\src\assets\sass\css\custom.css */
export const DEFAULT_FONT_SIZE: number = 0;
export const DEFAULT_TITLE_ALIGN: string = 'flex-start';
export const DEFAULT_PANEL_TITLE_ALIGN: string = 'flex-start';
export const EMPTY_VALUE: string = ''; // $localize`:@@EmptyValueMessage:Sin Informar` ;// Added empty values in different languages
export const NULL_VALUE: string = '';// null Agregado de null_value en diferentes idiomas  if you want to leave the null you can put this value: LEAVE_THE_NULL . THIS LEAVE_THE_NULL will leave the null value as null
export const DEFAULT_PALETTE_COLOR: any = ChartsPalettes.find(palette => palette.name === "Gradiente");
export const FATHER_ID: number = 0; // Parent ID value for the Treetable component
