export type SdaDbMessageLang = 'es' | 'ca' | 'en' | 'gl';

export type SdaDbMessageKey =
  | 'unknownColumn'
  | 'unknownTable'
  | 'accessDenied'
  | 'syntaxError'
  | 'tooManyConnections'
  | 'lockTimeout'
  | 'connectionRefused'
  | 'generic'
  | 'fallback';

const SDA_DB_ERROR_MESSAGES: Record<SdaDbMessageKey, Record<SdaDbMessageLang, (value?: string) => string>> = {
  unknownColumn: {
    es: (value?: string) => `El campo '${value || '?'}' está incluido en el informe pero no existe en la base de datos.`,
    en: (value?: string) => `The field '${value || '?'}' is included in the report but not exists in the database.`,
    ca: (value?: string) => `El camp '${value || '?'}' està inclòs a l'informe pero no existeix a la base de dades.`,
    gl: (value?: string) => `O campo '${value || '?'}' esta incluido no informe pero non esta disponible na base de datos.`,
  },
  unknownTable: {
    es: (value?: string) => `La tabla '${value || '?'}' no existe en la base de datos. Revise el modelo de datos.`,
    en: (value?: string) => `The table '${value || '?'}' does not exist in the database. Please review the data model.`,
    ca: (value?: string) => `La taula '${value || '?'}' no existeix a la base de dades. Reviseu el model de dades.`,
    gl: (value?: string) => `A taboa '${value || '?'}' non existe na base de datos. Revisa o modelo de datos.`,
  },
  accessDenied: {
    es: () => 'Acceso denegado a la base de datos. Verifique las credenciales de conexión.',
    en: () => 'Access denied to the database. Please check the connection credentials.',
    ca: () => 'Acces denegat a la base de dades. Verifiqueu les credencials de connexió.',
    gl: () => 'Acceso denegado a base de datos. Verifica as credenciais de conexion.',
  },
  syntaxError: {
    es: () => 'Error de sintaxis en la consulta SQL. Revísela.',
    en: () => 'Syntax error in SQL query. Please review it.',
    ca: () => 'Error de sintaxi a la consulta SQL. Reviseu-la.',
    gl: () => 'Erro de sintaxe na consulta SQL. Revisa a consulta.',
  },
  tooManyConnections: {
    es: () => 'Demasiadas conexiones activas en la base de datos. Inténtelo de nuevo más tarde.',
    en: () => 'Too many active connections in the database. Please try again later.',
    ca: () => 'Massa connexions actives a la base de dades. Torneu-ho a provar més tard.',
    gl: () => 'Demasiadas conexions activas na base de datos. Intentalo de novo mais tarde.',
  },
  lockTimeout: {
    es: () => 'Tiempo de espera agotado por bloqueo en la base de datos. Inténtelo de nuevo.',
    en: () => 'Database lock wait timeout exceeded. Please try again.',
    ca: () => "S'ha esgotat el temps d'espera per bloqueig a la base de dades. Torneu-ho a provar.",
    gl: () => 'Tempo de espera esgotado por bloqueo na base de datos. Intentalo de novo.',
  },
  connectionRefused: {
    es: () => 'No se puede conectar con la base de datos. Verifique que el servidor está disponible.',
    en: () => 'Cannot connect to the database. Please verify the server is available.',
    ca: () => 'No es pot connectar amb la base de dades. Verifiqueu que el servidor está disponible.',
    gl: () => 'Non se pode conectar coa base de datos. Verifica que o servidor esta dispoñible.',
  },
  generic: {
    es: (value?: string) => `Error en la consulta a la base de datos: ${value || ''}`,
    en: (value?: string) => `Database query error: ${value || ''}`,
    ca: (value?: string) => `Error en la consulta a la base de dades: ${value || ''}`,
    gl: (value?: string) => `Erro na consulta a base de datos: ${value || ''}`,
  },
  fallback: {
    es: () => 'Error al consultar la base de datos',
    en: () => 'Error querying database',
    ca: () => 'Error en consultar la base de dades',
    gl: () => 'Erro ao consultar a base de datos',
  },
};

export function resolveSdaDbLang(lang?: string | false): SdaDbMessageLang {
  return typeof lang === 'string' && ['es', 'ca', 'en', 'gl'].includes(lang)
    ? (lang as SdaDbMessageLang)
    : 'en';
}

export function getSdaDbErrorMessage(key: SdaDbMessageKey, lang: SdaDbMessageLang, value?: string): string {
  return SDA_DB_ERROR_MESSAGES[key][lang](value);
}
