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
  '#10B4BD', '#BA5EEB', '#CEEB5E', '#EB965E', '#E2B1FC',
  '#1A78A8', '#9A4A86', '#B8D48E', '#225F9E', '#E8B07B',
  '#3A3E86', '#D0D56A', '#6C2C6C', '#148FAD', '#A55C96',
  '#98CACA', '#E2C86B', '#4A357A', '#AD6FA7', '#0FA7B0',
  '#B184B9', '#A4BED3', '#8D3B78', '#A5D0B0', '#2B4C93'
        ]
        , name: 'Turquesa-Rosa'
    },
        {
        paleta: [
  '#19D4DE', '#D07BFF', '#D8FF5E', '#FFB06B', '#F1C2FF',
  '#36B6FF', '#FF5CCB', '#7CFFB2', '#5B7CFF', '#FFD34D',
  '#00F5D4', '#FF6B6B', '#A3FF3E', '#7A5CFF', '#4DE6FF',
  '#FF8AD4', '#B6A6FF', '#9EFFC2', '#FFC48A', '#5CF2C7',
  '#C8FF8A', '#FFA6E8', '#8DEBFF', '#FFE36A', '#9D7BFF'
        ]
        , name: 'Turquesa-Rosa-Contraste'
    },{
        paleta: [
  '#024873', '#F2C53D', '#0FA697', '#591202', '#2BD7E3',
  '#FF8400', '#555555', '#A9D531', '#BF814B', '#1F9DA5',
  '#FEB714', '#E77770', '#34956F', '#FFAE57', '#0B6FA4',
  '#7C3AED', '#00C2A8', '#D946EF', '#22C55E', '#FB7185',
  '#60A5FA', '#F97316', '#94A3B8', '#84CC16', '#F59E0B'
        ]
        , name: 'Azul-Gris'
    },
    {
        paleta:[
    '#000000', '#1CEDB1', '#023E8A', '#00B0BA', '#1C1DED',
    '#7A7F7B', '#1CA1ED', '#477679', '#1C5FED', '#6CBEED',
    '#0B2B5B', '#34EBC8', '#155E75', '#2A6F97', '#3A86FF',
    '#0EA5E9', '#22D3EE', '#14B8A6', '#0F172A', '#94A3B8',
    '#1E40AF', '#38BDF8', '#64748B', '#06B6D4', '#0891B2'
        ]
        , name: 'Verde-Gris'
    },
    {
        paleta: [
  '#000000', '#48CAE4', '#03045E', '#90E0EF', '#023E8A',
  '#00B4D8', '#0077B6', '#ADE8F4', '#0096C7', '#CAF0F8',
  '#1E40AF', '#38BDF8', '#0F172A', '#60A5FA', '#155E75',
  '#22D3EE', '#334155', '#0EA5E9', '#64748B', '#0284C7',
  '#94A3B8', '#075985', '#7DD3FC', '#1D4ED8', '#0B2B5B'
        ]
        , name: 'Celeste-Negro'
    },
    {
        paleta: [
           '#CA42EB', '#4192EB', '#425EEB', '#9342EB', '#9E90EB',
        '#5C42EB', '#2B2E7A', '#7C3AED', '#60A5FA', '#1E40AF',
        '#C084FC', '#2563EB', '#A855F7', '#3B82F6', '#4C1D95',
        '#93C5FD', '#6D28D9', '#1D4ED8', '#E879F9', '#0F172A',
        '#8B5CF6', '#38BDF8', '#D8B4FE', '#312E81', '#7DD3FC'
        ]
        , name: 'Azul-Violeta'
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
export const DEFAULT_FONT_COLOR: string = '#455a64'
export const DEFAULT_FONT_FAMILY: string = 'Montserrat';  /* THIS MUST BE SET ALSO IN  \eda_app\src\assets\sass\css\custom.css */
export const DEFAULT_FONT_SIZE: number = 0;
export const DEFAULT_TITLE_ALIGN : string = 'flex-start';
export const DEFAULT_PANEL_TITLE_ALIGN : string = 'flex-start';
export const EMPTY_VALUE : string = ''; // $localize`:@@EmptyValueMessage:Sin Informar` ;// Agregado valores vacios en diferentes idiomas
export const NULL_VALUE : string = '' ;// null Agregado de null_value en diferentes idiomas  if you want to leave the null you can put this value: LEAVE_THE_NULL . THIS LEAVE_THE_NULL will leave the null value as null
export const DEFAULT_PALETTE_COLOR: any = ChartsPalettes.find(palette => palette.name === "Turquesa-Rosa");
export const FATHER_ID : number = 0; // Valor id de Padre para el componente Treetable
