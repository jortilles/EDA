// Corporate color customization
export const CORPORATE_COLORS = {
    // Base brand colors — used throughout the application
    primary:         '#00BFB3',      // Primary color (buttons, icons, gradients)
    primaryGradient: '#34D0C7',      // Gradient end color (chat header, FAB, bubbles)
    primaryRgb:      '0, 191, 179',  // RGB value of the primary for opacity uses (box-shadow, rgba)
    primaryHsl:      '175 100% 37%', // HSL components of the primary for --ring (Tailwind focus ring)

    // Chatbot-specific colors
    chat: {
        avatarBg:       '#CCFAF7',   // Robot avatar background (header and messages)
        avatarBgAlt:    '#99F0EB',   // Alternative avatar background (empty state gradient)
        avatarBorder:   '#55D6CD',   // Avatar border and table header
        surfaceHover:   '#E6FAF9',   // Hover background for suggestions and table rows
        tableHeader:    '#007B74',   // Text color in table headers
        linkColor:      '#00bfb3',   // Link color in messages
        linkHoverColor: '#008F87',   // Link color on hover
    },

    // Folder-specific colors (home — folder view and tag filters)
    folder: {
        iconBg:          '#CCFAF7',  // Closed folder icon background
        iconBgHover:     '#99F0EB',  // Hover or open folder icon background
        iconColor:       '#00BFB3',  // Closed folder icon color
        borderHover:     '#34D0C7',  // Folder card border on hover or when open
        iconColorHover:  '#007B74',  // Icon and text color on hover or when open
        cardBgOpen:      '#E6FAF9',  // Card background when the folder is open
        labelColorOpen:  '#005E58',  // Folder name color when open
    },

    // Action button colors in dialogs
    buttons: {
        // Confirm: primary affirmative action
        confirmBg:        '#00B0BA',  // Gradient start
        confirmBgEnd:     '#00c9b1',  // Gradient end
        confirmHoverBg:   '#006c72',  // Hover start
        confirmHoverBgEnd:'#05a592',  // Hover end

        // Auxiliary: secondary action (run query, open SQL, preview…)
        auxBg:            '#1D4ED8',  // Gradient start (blue-700)
        auxBgEnd:         '#3B82F6',  // Gradient end (blue-500)
        auxHoverBg:       '#1E40AF',  // Hover start (blue-800)
        auxHoverBgEnd:    '#2563EB',  // Hover end (blue-600)

        // Cancel: discard action
        cancelBg:         '#df4040',  // Gradient start
        cancelBgEnd:      '#ec2828',  // Gradient end
        cancelHoverBg:    'rgb(177, 39, 39)',  // Hover start
        cancelHoverBgEnd: '#bd3636',  // Hover end
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

export const LogoSidebar = 'assets/images/logos/logo.png';

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
export const GLOBAL_FILTER_BUTTON_POSITION: string = 'left'; // By default the is left but you be modified to 'right' 

export const UI_BEHAVIOR = {
  panel: {
    showLockInHeader: true, // true → lock button visible in panel header | false → lock in context menu
  }
};