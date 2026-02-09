export const ChartsPalettes = [
    {
        paleta: [
            '#10B4BD', '#1BA9C0', '#269EC3', '#3193C7', '#3C88CA',
            '#477DCE', '#5272D2', '#5D67D6', '#685CD9', '#7351DC',
            '#7F57D7', '#8B5DD2', '#9764CD', '#A36AC7', '#AF71C2',
            '#BB78BD', '#C77EB8', '#D285B3', '#DE8CAE', '#EA93A9',
            '#F29DA0', '#F7A68E', '#FAAD80', '#FCB37A', '#FDB0BA'
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
    }, {
        paleta: [
            '#5C86A6', '#F7DB86', '#69C8BC', '#A66B5C', '#8FE7ED',
            '#FFB56B', '#8C8C8C', '#CDE67D', '#D7B28E', '#74BFC3',
            '#FFD080', '#F2A7A3', '#7FC4A7', '#FFD1A0', '#73A7C6',
            '#B8A0F2', '#7BE2CF', '#F2A0EE', '#8EE0A6', '#FFB1C0',
            '#A8CCFF', '#FFB08A', '#C3CEDD', '#C7E87D', '#FFD59A'
        ]
        , name: 'Azul-Gris'
    },
    {
        paleta: [
            '#7FEFD1', '#6FE3D6', '#7AD3E0', '#8BC6EA', '#9ABCF3',
            '#A8B2FA', '#7AA6D9', '#5D86C9', '#476CB8', '#3353A6',
            '#2A4A90', '#1F3F7A', '#162F5E', '#0F223F', '#0B1A2B',
            '#2C2C2C', '#6C7A7C', '#8A989A', '#A7B3B5', '#C3CCCD',
            '#D6DEDF', '#E6EFF0', '#B9E7E4', '#A4D8DF', '#93C6D1'
        ]
        , name: 'Verde-Gris'
    },
    {
        paleta: [
            '#CAF0F8', '#C0ECF6', '#B6E7F4', '#ACE3F2', '#A2DEF0',
            '#98DAEF', '#8ED5ED', '#84D1EB', '#7ACCE9', '#70C8E7',
            '#66C3E5', '#5CBFE3', '#52BAE1', '#48B6DF', '#3EB1DD',
            '#34ADDB', '#2AA8D9', '#20A4D7', '#169FD5', '#0C9BD3',
            '#0296D1', '#027BB0', '#025F8F', '#02446E', '#000000'
        ]
        , name: 'Celeste-Negro'
    },
    {
        paleta: [
            '#425EEB', '#CA42EB', '#4192EB', '#9342EB', '#5C42EB',
            '#7DD3FC', '#7C3AED', '#60A5FA', '#A855F7', '#2563EB',
            '#C084FC', '#1D4ED8', '#D8B4FE', '#0F172A', '#93C5FD',
            '#4C1D95', '#38BDF8', '#6D28D9', '#E879F9', '#312E81',
            '#A78BFA', '#2DD4BF', '#F0ABFC', '#8DA2FB', '#9E90EB'
        ]
        , name: 'Azul-Violeta'
    },
    {
        paleta: [
            '#425EEB', '#00E5FF', '#CA42EB', '#00FF85', '#FF2BD6',
            '#4192EB', '#FFB000', '#9342EB', '#FF3D00', '#5C42EB',
            '#00C2FF', '#FF00A8', '#00FFCC', '#7C3AED', '#00FF3C',
            '#2563EB', '#FFD400', '#A855F7', '#FF006E', '#00A8FF',
            '#C084FC', '#00FF9A', '#FF4D8D', '#2D2AFF', '#9E90EB'
        ]
        , name: 'Azul-Violeta-contraste'
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
export const DEFAULT_TITLE_ALIGN: string = 'flex-start';
export const DEFAULT_PANEL_TITLE_ALIGN: string = 'flex-start';
export const EMPTY_VALUE: string = ''; // $localize`:@@EmptyValueMessage:Sin Informar` ;// Agregado valores vacios en diferentes idiomas
export const NULL_VALUE: string = '';// null Agregado de null_value en diferentes idiomas  if you want to leave the null you can put this value: LEAVE_THE_NULL . THIS LEAVE_THE_NULL will leave the null value as null
export const DEFAULT_PALETTE_COLOR: any = ChartsPalettes.find(palette => palette.name === "Turquesa-Rosa");
export const FATHER_ID: number = 0; // Valor id de Padre para el componente Treetable
