export const ChartsColors = [
    [2,72,115],
    [15,166,151],
    [242, 197, 61],
    [191, 129, 75],
    [89, 18, 2],
    [255,174,87],
    [169, 213, 49],
    [255,132,0],
    [231,119,112],
    [85,85,85],
    [31,157,165],
    [43,215,227],
    [254, 183, 20],
    [179, 205, 125],
    [52, 149, 111],
    [255,174,87],
    [169, 213, 49],
    [255,132,0],
    [231,119,112],
    [85,85,85]
];

export const ChartsPalettes = [
    {
        paleta: [
            '#10B4BD', '#299FC4', '#438ACB', '#5C75D3', '#755FDA',
            '#8969D9', '#9D73D8', '#B27CD7', '#D691C7', '#FDB0BA'
        ]
        , name: 'Turquesa-Rosa'
    },{
        paleta: [
            '#024873', '#0FA697', '#F2C53D', '#BF814B', '#591202',
            '#FFAE57', '#A9D531', '#FF8400', '#E77770', '#555555',
            '#1F9DA5', '#2BD7E3', '#FEB714', '#B3CD7D', '#34956F',
            '#FFAE57', '#A9D531', '#FF8400', '#E77770', '#555555'
        ]
        , name: 'Azul-Gris'
    },
    {
        paleta:[
            '#1CEDB1', '#00B0BA', '#6CBEED', '#1CA1ED', '#1C5FED',
            '#1C1DED', '#023E8A', '#000000', '#477679', '#7A7F7B'
        ]
        , name: 'Verde-Gris'
    },
    {
        paleta: [
            '#CAF0F8', '#ADE8F4', '#90E0EF', '#48CAE4', '#00B4D8',
            '#0096C7', '#0077B6', '#023E8A', '#03045E', '#000000'
        ]
        , name: 'Celeste-Negro'
    },
    {
        paleta: [
            '#425EEB', '#9342EB', '#5C42EB', '#4192EB', '#CA42EB', '#9E90EB'
        ]
        , name: 'Azul-Violeta'
    },
    
];

export const LogoImage = 'assets/images/logos/logo.png';

export const LogoSidebar = 'assets/images/logos/logo.png';

export const SubLogoImage = 'assets/images/logos/sub-logo.png';

export const BackgroundImage = 'assets/images/background/data-bg.png';

export const Tema = 'default-dark';

export const TemaUrl = 'assets/css/colors/sass/default-dark.css';


export const DEFAULT_BACKGROUND_COLOR: string = '#f1f0f0';
export const DEFAULT_PANEL_COLOR: string = '#ffffff';
export const DEFAULT_FONT_COLOR: string = '#455a64'
export const DEFAULT_FONT_FAMILY: string = 'Montserrat';  /* THIS MUST BE SET ALSO IN  \eda_app\src\assets\sass\css\custom.css */
export const DEFAULT_FONT_SIZE: number = 0;
export const DEFAULT_TITLE_ALIGN : string = 'flex-start';
export const DEFAULT_PANEL_TITLE_ALIGN : string = 'flex-start';
export const NULL_VALUE : string = 'null' ;
export const DEFAULT_PALETTE_COLOR: any = ChartsPalettes.find(palette => palette.name === "Turquesa-Rosa");
