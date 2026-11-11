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

/** Code editor syntax-highlighting colors (SQL/HTML expression fields, mail message, etc.).
 * Defaults match CodeMirror's own out-of-the-box palette — override any entry to re-brand it. */
export const CODE_EDITOR_SYNTAX_COLORS = {
    keyword:       '#708',     // SELECT, FROM, WHERE, if / else / end…
    atom:          '#219',     // booleans, URLs, labels
    literal:       '#164',     // numbers and other literals
    string:        '#a11',     // string values
    escape:        '#e40',     // regexp / escape sequences
    variableDef:   '#00f',     // a variable at its definition
    variableLocal: '#30a',     // a variable where it's used/referenced
    typeName:      '#085',     // type names / namespaces
    className:     '#167',     // class names
    specialVar:    '#256',     // special variables / macro names
    propertyDef:   '#00c',     // a property at its definition
    comment:       '#940',     // comments
    invalid:       '#f00',     // invalid/unrecognized tokens
    meta:          '#404740',  // meta content (e.g. HTML doctype/processing instructions)
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
export const DEFAULT_TABLE_TOTAL_COLOR: string = '#5ba38b8c'; // Fixed background for the "row totals" column 
export const DEFAULT_FONT_FAMILY: string = 'Montserrat';  /* THIS MUST BE SET ALSO IN  \eda_app\src\assets\sass\css\custom.css */
export const DEFAULT_FONT_SIZE: number = 0;
export const DEFAULT_TITLE_ALIGN: string = 'flex-start';
export const DEFAULT_PANEL_TITLE_ALIGN: string = 'flex-start';
export const EMPTY_VALUE: string = ''; // $localize`:@@EmptyValueMessage:Sin Informar` ;// Added empty values in different languages
export const NULL_VALUE: string = '';// null Agregado de null_value en diferentes idiomas  if you want to leave the null you can put this value: LEAVE_THE_NULL . THIS LEAVE_THE_NULL will leave the null value as null
export const DEFAULT_PALETTE_COLOR: any = ChartsPalettes.find(palette => palette.name === "Gradiente");
export const FATHER_ID: number = 0; // Parent ID value for the Treetable component
export const GLOBAL_FILTER_BUTTON_POSITION: string = 'left'; // By default the is left but you be modified to 'right'

/** Chart rendering limits: above them a chart is disabled in the selector and, if already saved, rendered as a plain table
 * so the browser does not collapse. Tables and histogram have no limit (histogram bins the data). */
export const CHART_RENDER_LIMITS = {
    pieMaxRows:            100,   // doughnut, polarArea: allowed while rows < value
    lineMaxRows:           8000,  // line, kpiline, area, kpiarea, barline: allowed while rows < value
    chartMaxRows:          5000,  // any other chart (bars, radar, sankey, treemap, sunburst, scatter, bubble, funnel, race bar, kpi trend, maps): allowed while rows < value
    maxCrosstableColumns:  50,    // cross tables generating more columns than this are rendered as a plain table
};

/** KPI sizing (eda-kpi/kpi-dialog). Same shape/names as SinergiaDA's KPI_CONFIG, so future
 * merges from their migration/kpiFitContainer_v2 line don't conflict on this block. */
export const KPI_CONFIG = {
    USE_EDALITICS_SIZE_LOGIC: true, // moves where the value's +/- control lives — true → Edalitics (dialog) false -> forks (hover buttons on the KPI, not implemented here)
    MIN_FONT_SCALE: 0.2,      // 20% minimum
    MAX_FONT_SCALE: 2.5,      // maximum scale (250%)
    DEFAULT_FONT_SCALE: 0.8,  // default scale (80%)
    IMAGE_MIN_SCALE: 0.1,     // 10% minimum width share for the image
    IMAGE_MAX_SCALE: 0.7,     // 70% maximum width share for the image
    IMAGE_DEFAULT_SCALE: 0.2, // 20% default width share for the image
    STACK_RATIO: 16 / 9,      // plain kpi (a "widescreen" shape)
    CHART_STACK_RATIO: 5 / 4, // kpi+chart — the chart eats most of the panel's height, leaving a squarer strip for the value
};

export const  AGG_TYPES  = [
    { label: $localize`:@@aggTsum:Suma`, value: 'sum' },
    { label: $localize`:@@aggTmean:Media`, value: 'avg' },
    { label: $localize`:@@aggTmax:Máximo`, value: 'max' },
    { label: $localize`:@@aggTmin:Mínimo`, value: 'min' },
    { label: $localize`:@@aggTcount:Cuenta Valores`, value: 'count' },
    { label: $localize`:@@aggTcountD:Valores Distintos`, value: 'count_distinct' },
    { label: 'No', value: 'none' }
];

/** Feature flags variables  */
export const APPLICATION_NAME: string = 'Edalitics'; // application name shown in the browser tab title
export const SHOW_LOCK_IN_PANEL_HEADER: boolean = false; // true → lock button visible in panel header | false → lock in context menu
export const SHOW_HIDDEN_FIELDS_BUTTON: boolean = false; // true → Show the hidden fields button | false → Don't show the hidden fields button
export const SHOW_HIDDEN_FIELDS_BUTTON_ADMIN_ONLY: boolean = false; // true → only admins see the button | false → all users see it
export const ALLOW_NON_ADMIN_MANAGE_PUBLIC_REPORTS: boolean = false; // true → public visibility option shown in dashboard creation/edit UIs | false → hidden
export const USE_VALUE_LIST_CODE_FOR_FILTERS: boolean = false; // true -> compare filters against the value-list's internal codes instead of the raw selected values.
export const ALLOWED_QUERY_MODES: string[] = ['EDA', 'SQL', 'TREE']; // ALLOWED_QUERY_MODES Order matters; the first value "ALLOWED_QUERY_MODES[0]" is considered the default query mode. Keep all 3 (EDA, existing behaviour) unless you want to restrict them.
export const SHOW_WHAT_IF: boolean = true; // true → "What If?" scenarios button visible (EDA, existing behaviour) | false → hidden
export const ALLOWED_JOIN_TYPES: string[] = ['left', 'inner', 'right']; // subset of 'left' | 'inner' | 'right' shown as join type options. Keep all 3 (EDA, existing behaviour) unless you want to restrict them.
export const SHOW_CUSTOM_ACTION: boolean = true; // true → "Acción personalizada" visible en el menú del informe (EDA, existing behaviour) | false → oculta
export const SHOW_ZOOM_IN_SIDEBAR: boolean = true   ; // true → zoom control lives inside the dashboard sidebar | false → zoom control lives in the filters bar
export const PRIVATE_EDITION_ACTIVATED: boolean = false;
export const USE_EDA_TABLE_TOTALS_LOGIC: boolean = true; // true → current EDA logic (existing behaviour, keep as default) | false → SDA logic (sum of row percentages + single final rounding)
export const AI_ASSISTANT_MANAGEMENT_AVAILABLE: boolean = true; // true → "Gestión del asistente" visible in the admin menu (EDA, existing behaviour) | false → hidden
export const CUSTOMIZE_SIDE_MENU_ICONS: any = { // Icon name (IconService registry) per side-menu entry | 'none' or '' → entry hidden
    home: 'home',
    create: 'plus',
    management: 'molecula',
    settings: 'settings',
    information: 'global',
    logout: 'logout',
};
export const ENABLED_LANGUAGES: string[] = ['es', 'ca', 'de', 'en', 'fr', 'it', 'pl', 'pt']; // Locale codes shown in the language selector (EDA's 8 locales, all enabled by default). Each one must have a matching build in angular.json's i18n.locales (or be the sourceLocale) — this flag only controls what's offered in the UI, it doesn't build/remove locales.

/** Feature flags - data-source page */
/** Data model - General configuration*/
export const PROTECTED_MODEL_AI_CONTROL_ENABLED: boolean = true; // true → AI Control enabled | false → AI Control unavailable
export const PROTECTED_MODEL_SSL_CONNECTION_SWITCH_BUTTON_ENABLED: boolean = true; // true → SSL connection enabled | false → SSL connection unavailable
export const PROTECTED_MODEL_ADD_VIEW_BUTTON_ENABLED: boolean = true; // true → Add view enabled | false → Add view unavailable
export const PROTECTED_MODEL_ADD_TABLE_FROM_CSV_BUTTON_ENABLED: boolean = true; // true → Add table from CSV enabled | false → Add table from CSV unavailable
export const PROTECTED_MODEL_ADD_TAG_BUTTON_ENABLED: boolean = true; // true → Add tag enabled | false → Add tag unavailable
/** Data model - Table configuration*/
export const PROTECTED_MODEL_TABLE_TYPES_BUTTON_GROUP_ENABLED: boolean = false; // false → Table types group unavailable | true → Table types group enabled
export const PROTECTED_MODEL_ADD_RELATIONSHIP_TO_TABLE_BUTTON_ENABLED: boolean = true; // true → Relationship to table enabled | false → Relationship to table unavailable
export const PROTECTED_MODEL_HIDE_ALL_COLUMNS_BUTTON_ENABLED: boolean = true; // true → hide all columns enabled | false → hide all columns unavailable
/** Data model - Column configuration => Calculated Fields*/
export const PROTECTED_MODEL_DEFINE_LIST_OF_POSSIBLE_VALUES_BUTTON_ENABLED: boolean = true; // true → Define a list of possible values enabled | false → Define a list of possible values unavailable
export const PROTECTED_MODEL_ADD_PERMISSION_BUTTON_ENABLED: boolean = true; // true → Add permission enabled | false → Add permission unavailable
/** Data model - Protected data sources*/
export const PROTECTED_MODEL_DATA_SOURCES_ARRAY: string[] = []; // Array of all the protected data sources
