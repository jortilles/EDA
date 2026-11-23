/**
 * Traducción código técnico de esquema (ámbito) del datalake AOC -> nombre legible.
 * Solo los esquemas presentes aquí se ofrecen al usuario; el resto se ignoran al listar ámbitos.
 */
export const AOC_AMBITOS_MAP: Record<string, string> = {
    aca_ddoo: 'Agència Catalana de l\'Aigua',
    aeat_ddoo: 'Agencia Estatal de Administración Tributaria (AEAT)',
    age_ddoo: 'Administración General del Estado',
    aoc_bretxa_digital: 'AOC - Bretxa Digital',
    aoc_canal_alertes: 'AOC - Canal d\'Alertes',
    aoc_datadis: 'AOC - Datadis',
    aoc_ddoo: 'AOC - Dades d\'altres organismes',
    aoc_dir3: 'AOC - DIR3 (Directori d\'unitats i oficines)',
    aoc_dwh: 'AOC - Data Warehouse intern', // confirmar
    aoc_eacat3: 'AOC - EACAT',
    aoc_efact: 'AOC - e.FACT (factura electrònica)',
    aoc_enotum: 'AOC - e-NOTUM',
    aoc_etram: 'AOC - e-TRAM',
    aoc_global: 'AOC - Dades globals', // confirmar
    aoc_imd: 'AOC - IMD', // confirmar
    aoc_indicadors_hut: 'AOC - Indicadors HUT', // confirmar
    aoc_informes_eficiencia: 'AOC - Informes d\'eficiència',
    aoc_informes_eficiencia_old: 'AOC - Informes d\'eficiència (versió antiga)',
    aoc_oacs: 'AOC - OAC (Oficines d\'Atenció Ciutadana)', // confirmar
    aoc_sibilare: 'AOC - Sibil·la', // confirmar
    aoc_suport: 'AOC - Suport',
    aoc_tsa: 'AOC - TSA (segellat de temps)', // confirmar
    aoc_valid: 'AOC - Valid (validador de signatura electrònica)',
    aoc_via_oberta: 'AOC - Via Oberta',
    aoc_visor_ods_mon_local: 'AOC - Visor ODS Món Local',
    cadastre_ddoo: 'Dirección General del Catastro',
    cnig_ddoo: 'Centre Nacional d\'Informació Geogràfica (CNIG)',
    diba_cido_ddoo: 'Diputació de Barcelona (CIDO)',
    eurostat_gisco: 'Eurostat - GISCO',
    gencat_ddoo: 'Generalitat de Catalunya',
    icgc_ddoo: 'Institut Cartogràfic i Geològic de Catalunya (ICGC)',
    idescat_ddoo: 'Institut d\'Estadística de Catalunya (Idescat)',
    idescat_padro: 'Idescat - Padró municipal',
    ign_ddoo: 'Instituto Geográfico Nacional (IGN)',
    ine_ddoo: 'Instituto Nacional de Estadística (INE)',
    meteocat_ddoo: 'Servei Meteorològic de Catalunya (Meteocat)',
    minhap_ddoo: 'Ministeri d\'Hisenda i Administracions Públiques',
    mitma_ddoo: 'Ministeri de Transports, Mobilitat i Agenda Urbana',
    segsocial_ddoo: 'Seguretat Social',
};
