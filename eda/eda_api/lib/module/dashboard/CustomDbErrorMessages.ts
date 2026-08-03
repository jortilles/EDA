export type CustomDbMessageLang = 'es' | 'ca' | 'en' | 'fr' | 'pl' | 'gl';

export type CustomDbMessageKey =
  | 'unknownColumn'
  | 'unknownTable'
  | 'accessDenied'
  | 'syntaxError'
  | 'tooManyConnections'
  | 'lockTimeout'
  | 'connectionRefused'
  | 'generic'
  | 'fallback';

const CUSTOM_DB_ERROR_MESSAGES: Record<CustomDbMessageKey, Record<CustomDbMessageLang, (value?: string) => string>> = {
  unknownColumn: {
    es: (value?: string) => `El campo '${value || '?'}' está incluido en el informe pero no existe en la base de datos.`,
    en: (value?: string) => `The field '${value || '?'}' is included in the report but not exists in the database.`,
    ca: (value?: string) => `El camp '${value || '?'}' està inclòs a l'informe pero no existeix a la base de dades.`,
    fr: (value?: string) => `Le champ '${value || '?'}' est inclus dans le rapport mais n'existe pas dans la base de données.`,
    pl: (value?: string) => `Pole '${value || '?'}' jest uwzględnione w raporcie, ale nie istnieje w bazie danych.`,
    gl: (value?: string) => `O campo '${value || '?'}' esta incluido no informe pero non esta disponible na base de datos.`,
  },
  unknownTable: {
    es: (value?: string) => `La tabla '${value || '?'}' no existe en la base de datos. Revise el modelo de datos.`,
    en: (value?: string) => `The table '${value || '?'}' does not exist in the database. Please review the data model.`,
    ca: (value?: string) => `La taula '${value || '?'}' no existeix a la base de dades. Reviseu el model de dades.`,
    fr: (value?: string) => `La table '${value || '?'}' n'existe pas dans la base de données. Veuillez vérifier le modèle de données.`,
    pl: (value?: string) => `Tabela '${value || '?'}' nie istnieje w bazie danych. Sprawdź model danych.`,
    gl: (value?: string) => `A taboa '${value || '?'}' non existe na base de datos. Revisa o modelo de datos.`,
  },
  accessDenied: {
    es: () => 'Acceso denegado a la base de datos. Verifique las credenciales de conexión.',
    en: () => 'Access denied to the database. Please check the connection credentials.',
    ca: () => 'Acces denegat a la base de dades. Verifiqueu les credencials de connexió.',
    fr: () => 'Accès refusé à la base de données. Veuillez vérifier les identifiants de connexion.',
    pl: () => 'Odmowa dostępu do bazy danych. Sprawdź dane logowania połączenia.',
    gl: () => 'Acceso denegado a base de datos. Verifica as credenciais de conexion.',
  },
  syntaxError: {
    es: () => 'Error de sintaxis en la consulta SQL. Revísela.',
    en: () => 'Syntax error in SQL query. Please review it.',
    ca: () => 'Error de sintaxi a la consulta SQL. Reviseu-la.',
    fr: () => "Erreur de syntaxe dans la requête SQL. Veuillez la vérifier.",
    pl: () => 'Błąd składni w zapytaniu SQL. Sprawdź je.',
    gl: () => 'Erro de sintaxe na consulta SQL. Revisa a consulta.',
  },
  tooManyConnections: {
    es: () => 'Demasiadas conexiones activas en la base de datos. Inténtelo de nuevo más tarde.',
    en: () => 'Too many active connections in the database. Please try again later.',
    ca: () => 'Massa connexions actives a la base de dades. Torneu-ho a provar més tard.',
    fr: () => 'Trop de connexions actives à la base de données. Veuillez réessayer plus tard.',
    pl: () => 'Zbyt wiele aktywnych połączeń z bazą danych. Spróbuj ponownie później.',
    gl: () => 'Demasiadas conexions activas na base de datos. Intentalo de novo mais tarde.',
  },
  lockTimeout: {
    es: () => 'Tiempo de espera agotado por bloqueo en la base de datos. Inténtelo de nuevo.',
    en: () => 'Database lock wait timeout exceeded. Please try again.',
    ca: () => "S'ha esgotat el temps d'espera per bloqueig a la base de dades. Torneu-ho a provar.",
    fr: () => "Délai d'attente de verrouillage de la base de données dépassé. Veuillez réessayer.",
    pl: () => 'Przekroczono limit czasu oczekiwania na blokadę w bazie danych. Spróbuj ponownie.',
    gl: () => 'Tempo de espera esgotado por bloqueo na base de datos. Intentalo de novo.',
  },
  connectionRefused: {
    es: () => 'No se puede conectar con la base de datos. Verifique que el servidor está disponible.',
    en: () => 'Cannot connect to the database. Please verify the server is available.',
    ca: () => 'No es pot connectar amb la base de dades. Verifiqueu que el servidor está disponible.',
    fr: () => 'Impossible de se connecter à la base de données. Veuillez vérifier que le serveur est disponible.',
    pl: () => 'Nie można połączyć się z bazą danych. Sprawdź, czy serwer jest dostępny.',
    gl: () => 'Non se pode conectar coa base de datos. Verifica que o servidor esta dispoñible.',
  },
  generic: {
    es: (value?: string) => `Error en la consulta a la base de datos: ${value || ''}`,
    en: (value?: string) => `Database query error: ${value || ''}`,
    ca: (value?: string) => `Error en la consulta a la base de dades: ${value || ''}`,
    fr: (value?: string) => `Erreur lors de la requête à la base de données: ${value || ''}`,
    pl: (value?: string) => `Błąd zapytania do bazy danych: ${value || ''}`,
    gl: (value?: string) => `Erro na consulta a base de datos: ${value || ''}`,
  },
  fallback: {
    es: () => 'Error al consultar la base de datos',
    en: () => 'Error querying database',
    ca: () => 'Error en consultar la base de dades',
    fr: () => 'Erreur lors de la consultation de la base de données',
    pl: () => 'Błąd podczas zapytania do bazy danych',
    gl: () => 'Erro ao consultar a base de datos',
  },
};

export function resolveCustomDbLang(lang?: string | false): CustomDbMessageLang {
  return typeof lang === 'string' && ['es', 'ca', 'en', 'fr', 'pl', 'gl'].includes(lang)
    ? (lang as CustomDbMessageLang)
    : 'en';
}

export function getCustomDbErrorMessage(key: CustomDbMessageKey, lang: CustomDbMessageLang, value?: string): string {
  return CUSTOM_DB_ERROR_MESSAGES[key][lang](value);
}
