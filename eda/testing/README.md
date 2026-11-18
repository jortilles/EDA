# EDA / Edalitics - Suite de testing (Playwright)

Suite de testing end-to-end (navegador real, Chromium) **y** de API HTTP para toda la
aplicación EDA, con Playwright. Cubre backend (`eda_api`) y frontend (`eda_app`) contra
una instancia real corriendo en local.

## Arranque rápido

```bash
cd eda/testing
npm install
npm run install:browsers   # una sola vez
cp .env.example .env       # y ajusta si hace falta (ver mas abajo)
npm test                   # corre TODO: API + navegador
```

- La API (`eda_api`, puerto fijo **8666**) se arranca sola si no está ya corriendo
  (`npm run dev` dentro de `eda_api`, vía Playwright `webServer`).
- El frontend (`eda_app`, puerto **4200**) se reutiliza si ya tienes `ng serve` abierto;
  si no, también se arranca solo.
- Al terminar, `npm run report` abre el informe HTML detallado.

Los que más se usan en el día a día:

```bash
npm test                 # TODO: API + navegador
npm run test:e2e         # solo los tests de navegador
npm run test:api         # solo los tests de API (sin navegador)
npm run report           # sirve el ultimo informe HTML en http://localhost:9323 (tests, videos, trazas, capturas)
npx playwright test tests/e2e/login.spec.ts   # un archivo concreto
npx playwright test -g "login con credenciales"   # por nombre (regex)
```

Resto de comandos disponibles (`package.json`):

```bash
npm run test:coverage    # tests de navegador + cobertura JS real medida (ver "Cobertura")
npm run test:headed      # navegador visible, util para depurar
npm run test:ui          # modo interactivo de Playwright (elegir/relanzar/inspeccionar paso a paso)
npm run test:debug       # modo debug con inspector paso a paso
npm run install:browsers # instala/reinstala el Chromium que usa Playwright
npm run codegen          # grabar interacciones contra localhost:4200 para generar tests nuevos
```

## Cómo está organizado

```
tests/
  fixtures/
    global.setup.ts      # bootstrap: crea usuarios de test dedicados y sesiones
    global.teardown.ts    # limpia TODO lo creado por la suite al terminar
    base.ts               # fixtures compartidos (api, apiAsLimitedUser, track, uniqueName...)
    ui-helpers.ts          # helpers de interacción UI reutilizados entre specs
  api/     # ~96 tests de API HTTP directa contra eda_api (puerto 8666)
  e2e/     # ~39 tests de navegador (Chromium) contra eda_app (puerto 4200)
utils/
  api-client.ts       # cliente HTTP consciente de como EDA autentica (ver abajo)
  env.ts              # config desde .env
  duckdb-fixture.ts   # genera una datasource real sin depender de ninguna BD externa
  resource-log.ts     # registro de "qué se creó" para el borrado preciso
  summary-reporter.ts # resumen final categorizado de fallos
```

## Decisiones de diseño (y por qué)

**Autenticación por query param, no por header.** El backend (`auth-guard.ts`) lee el
JWT de `?token=...` en la URL, en TODAS las peticiones (incluido POST/PUT/DELETE), nunca
de `Authorization: Bearer`. `ApiClient` (`utils/api-client.ts`) lo añade automáticamente.

**Usuarios de test dedicados, nunca `pruebaAdmin`.** Al arrancar, la suite hace login
UNA VEZ con un admin ya existente (`BOOTSTRAP_ADMIN_EMAIL`/`PASSWORD` en `.env`, por
defecto `pruebaAdmin`) solo para crear dos usuarios nuevos y aislados para el run
(un admin y un usuario sin permisos), y no vuelve a tocar `pruebaAdmin`. Los credenciales
del bootstrap solo viven en `.env` (no versionado).

**Ningún conector de BD externo real.** Como se acordó, no se prueba contra
MySQL/Postgres/Oracle/etc. reales. Las pruebas "con datos de verdad" (dashboards,
queries, gráficos) usan una datasource real basada en **CSV + DuckDB**
(`/datasource/add-duckdb-data-source`), la única vía que no abre ninguna conexión de
red — es la mejor aproximación a un "mock" sin tener que parchear el backend en marcha.
Los conectores SQL externos se prueban solo en su manejo de errores (host inalcanzable
→ error controlado, nunca 2xx ni caída del proceso).

**Nada de IA real.** El asistente (`/assistant/*`, `/ia`, `/ia/chat`) usa una API key
real de Anthropic con coste. La suite de API solo prueba los caminos que se resuelven
ANTES de llamar al LLM (guards, validación). La suite de navegador prueba el widget de
chat completo (abrir, escribir, recibir respuesta, error del backend) **mockeando la red**
con `page.route()`, replicando el formato SSE exacto que usa el frontend — cero llamadas
reales, cero coste.

**Limpieza automática de datos.** Todo lo que crea la suite (usuarios, dashboards,
datasources, grupos, media) se etiqueta con un prefijo único por ejecución
(`TEST_RUN_PREFIX` + un id de run) y se borra al final. Hay dos vías, ambas activas:
1. **Precisa**: cada test registra el id exacto de lo que crea (`track()`); el teardown
   lo borra por id, sin depender de listar nada.
2. **Best-effort**: un barrido final por prefijo sobre cada listado, por si algo se
   creó sin registrarse o quedó de un run interrumpido.

## Variables de entorno (`.env`, no versionado)

Ver `.env.example`. Las importantes:
- `BOOTSTRAP_ADMIN_EMAIL` / `PASSWORD`: admin ya existente usado solo para el arranque.
- `TEST_RUN_PREFIX`: prefijo de los datos de test (para poder distinguirlos y limpiarlos).
- `AUTO_START_API`: si `false`, asume que tú ya tienes `eda_api` corriendo.

## Hallazgos reales encontrados por esta suite

Construir esta suite sacó a la luz varios problemas reales de la aplicación (no de los
tests). Cada uno tiene un test dedicado que lo documenta explícitamente
(marcado `[hallazgo]` en el nombre) para que si algún día se corrige, el test empiece a
fallar y avise de que hay que actualizarlo:

1. **[Seguridad, severidad alta] Fuga de la API key de IA a cualquier usuario autenticado.**
   `GET /assistant/config` (`ai.controller.ts:140`, `ai.router.ts:125`) solo lleva
   `authGuard`, sin `roleGuard`. Devuelve la API key real del proveedor de IA y la
   contraseña del servicio MCP en texto plano. Cualquier usuario logueado, sin ningún
   rol, puede leerlas. Test: `tests/api/assistant-and-mcp.spec.ts` (falla a propósito).

2. **[Seguridad, severidad media] `/logs` sin control de acceso por rol.** La ruta de
   frontend `logs` (`pages-v3.routes.ts` ~L86) y las rutas de API
   `/admin/log/log-file` y `/admin/log/log-error-file` (`log.router.ts`) solo requieren
   estar autenticado, no ser admin — a diferencia de TODAS las demás rutas de
   `/admin/*`. El enlace del menú se oculta para no-admins, pero la ruta y la API están
   abiertas igualmente. Tests: `tests/e2e/permissions-ui.spec.ts`,
   `tests/api/logs.spec.ts` (fallan a propósito).

3. **[Fiabilidad, severidad alta] Un dashboard sin datasource real asociada rompe
   `DELETE /datasource/:id` para CUALQUIER datasource.** `DeleteDataSource`
   (`datasource.controller.ts` ~L355) hace `dashboards.filter(d => d.config.ds._id === ...)`
   sobre TODOS los dashboards de la base de datos sin comprobar que `config.ds` exista;
   si un solo dashboard tiene `ds` vacío o ausente, el borrado de cualquier datasource
   (no solo la suya) devuelve 500. El mismo patrón rompe `GET /dashboard/:id`
   (`dashboard.controller.ts` ~L564) para ESE dashboard en concreto. Reproducido y
   verificado manualmente durante la construcción de esta suite (y limpiado de la BBDD
   de dev en el proceso). Test: `tests/api/dashboards.spec.ts` (test `[hallazgo]`).

4. **[Fiabilidad, severidad baja] `GET /datasource` es lento/inestable en la BBDD de
   dev actual.** El listado de datasources (`GetDataSources`) itera TODAS las
   datasources y desencripta su password; con los datos reales actuales del entorno de
   dev, a veces tarda >15s o devuelve error. Probablemente por algún registro legacy con
   password corrupta o no válida en base64 (`EnCrypterService.decode` puede lanzar).
   Esta suite lo tolera (es la vía "best-effort" del teardown) pero merece revisión.

5. **[Menor] El nombre/email del propio perfil no se sincroniza en el navegador tras
   guardar.** `user-profile.page.ts` (`saveUser()`) actualiza el usuario en el servidor
   vía `manageUpdateUsers()` pero nunca reescribe `localStorage["user"]` (a diferencia
   del login, que sí lo hace en `savingStorage()`). El cambio se guarda correctamente en
   la base de datos, pero la sesión del propio navegador sigue mostrando el nombre
   antiguo hasta el próximo login. Test: `tests/e2e/profile.spec.ts` (test `[hallazgo]`).

6. **[Menor, UI] Primer click "perdido" en botones de fila justo tras filtrar una
   tabla.** En `/admin/users` y `/admin/groups`, justo después de que el filtro de
   búsqueda re-renderice una fila (`@for` de Angular), el primer click sobre un botón de
   esa fila (borrar, editar) a veces no llega a disparar su `(click)` — sin excepciones,
   sin efecto visible más allá del foco. Un segundo click siempre funciona. Los tests
   correspondientes lo compensan (`tests/fixtures/ui-helpers.ts:clickUntilSwalConfirm`),
   pero un usuario real podría experimentar el mismo click "que no hace nada".

7. **[Menor, fiabilidad] "Tabla DataQuality" cierra el editor de consulta antes de
   confirmar.** A diferencia de TODOS los demás tipos de gráfico, elegir "Tabla
   DataQuality" en el desplegable cierra el editor de consulta al instante —
   `eda-blank-panel.component.ts` (`changeChartTypeCheck`, ~L911-940) llama a
   `this.closeEditarConsulta()` en la misma línea síncrona en la que se abre
   `Swal.fire(...).then(...)`, sin esperar la respuesta del usuario. Efecto real: si el
   usuario pulsa "Cancelar" en el Swal de confirmación, el editor se cierra igual,
   perdiendo la consulta que estuviera configurando sin ningún motivo (para el resto de
   tipos, cancelar no cierra nada). Test:
   `tests/e2e/dashboard-charts.spec.ts` (`[hallazgo]`, al final del archivo).

Ningún otro comportamiento inesperado detectado se ha "arreglado" en el código de la
app — esta suite solo prueba y documenta; los cambios reales quedan a tu criterio.

## Cobertura

**API (`tests/api/`, ~96 tests):** autenticación y guards (401/403 en cascada),
usuarios, grupos, dashboards (CRUD + clonar + visibilidad pública), datasource DuckDB
(CRUD + tablas), validación de los 8 conectores SQL externos, ejecución real de queries
SQL contra datos reales (incluye agregaciones), media (archivos + carpetas), subida de
imagen de perfil, predicciones ARIMA/TensorFlow, Custom HTML, Custom Action Call, Mail
(solo validación, nunca toca el SMTP real), Excel/JSON datasource (solo validación, no
deja colecciones Mongo huérfanas), asistente IA y MCP (solo caminos sin LLM real), logs,
api-docs.

**Navegador (`tests/e2e/`, ~44 tests):** login (éxito/error/sesión expirada), home y
navegación (incluida barra lateral y logout), CRUD completo de dashboards desde la UI
real (crear vía diálogo, ver el dashboard, borrar), administración de usuarios y grupos
desde sus diálogos reales, asistente de creación de datasource (desplegable de motores,
"Probar conexión" contra host inalcanzable), perfil de usuario, chatbot de IA (mockeado
por red, sin coste), permisos de un usuario sin rol admin (rutas protegidas, menú
lateral, hallazgo de `/logs`).

**Paneles y gráficos dentro de un dashboard (`tests/e2e/dashboard-charts.spec.ts`):**
la prueba más larga de toda la suite. Dentro de un mismo dashboard, usando el editor de
paneles real (botón "Nuevo panel" -> elegir tabla y campos -> Ejecutar -> elegir tipo de
gráfico -> Confirmar, exactamente como lo haría una persona), crea **un panel de cada uno
de 30 de los 31 tipos de gráfico que ofrece la aplicación** (tablas, KPIs, circulares,
barras, líneas, dispersión, embudo, radar, mapas de árbol, etc. — la lista completa vive
en `services/utils/chart-utils.service.ts:chartTypes`), comprueba que ninguno da error,
guarda el dashboard entero, recarga la página y confirma que los 30 paneles persisten.
Después también edita el tipo de gráfico de un panel ya existente (menú del panel ->
"Cambiar tipo de gráfico") y borra otro panel, guardando y verificando cada cambio.

Cada tipo usa la combinación de campos que **de verdad** necesita, no una genérica de
"1 categórico + 1 numérico" para todos — eso no reflejaría lo que cada tipo espera (p.ej.
ParallelSets pide un numérico y 2+ categóricos para tener una jerarquía real; Histograma
pide exactamente 1 columna numérica y nada más; KPI Tendencia pide una fecha con un
formato de agrupación ya asignado). El mapeo exacto por tipo está en `CHART_TYPE_CASES`
al principio de `dashboard-charts.spec.ts`, y se basa directamente en la validación real
que usa la propia app (`getNotAllowedCharts()` en `chart-utils.service.ts:634-791`) para
decidir qué tipos están disponibles según la consulta.

Se excluyen del recorrido masivo:
- Los 2 tipos de **mapa** (Mapa de coordenadas / Mapa de Capas): necesitan datos
  geográficos que la datasource de pruebas no tiene y usan un diálogo de configuración
  totalmente distinto, fuera del alcance de esta suite.
- **Tabla DataQuality**: tiene un flujo distinto a todos los demás (ver hallazgo #7 más
  abajo) y tiene su propio test dedicado, separado del recorrido masivo.

### Cobertura de código real (medida), no solo "número de tests"

El listado de arriba dice qué se prueba, pero no cuánto del código del frontend se
llega a ejecutar de verdad. Para eso:

```
npm run test:coverage
```

Corre toda la suite `chromium-e2e` con la cobertura JS de Chromium activada
(`page.coverage.startJSCoverage`/`stopJSCoverage`, vía CDP) y, al final, genera un
reporte real con [`monocart-coverage-reports`](https://github.com/cenfun/monocart-coverage-reports):
usa el sourcemap inline que `ng serve` (Vite) incluye en cada bundle para mapear la
cobertura de vuelta al TypeScript/HTML fuente real (`src/app/...`), no al bundle
minificado. Al terminar imprime una tabla en consola y dice dónde queda el reporte
HTML navegable: `eda/testing/coverage-report/index.html` (no versionado, se
regenera en cada `npm run test:coverage`).

Verificado en un run real de la suite completa: **31.6% de bytes de JS de la app
ejecutados**, sobre el código que llega a cargarse durante los tests. El reporte HTML
permite entrar archivo por archivo y ver línea a línea qué se ejecutó y qué no.

**Qué NO mide esto (para no venderlo como más de lo que es):**
- **Solo frontend.** No hay cobertura de rutas/controladores del backend (`eda_api`);
  para eso habría que instrumentar Node con `c8`/`nyc`, que es un mecanismo aparte.
- **Solo lo que llega a cargarse en el navegador.** Un componente lazy-loaded que
  ningún test navega a abrir ni siquiera aparece en el reporte (no cuenta como "0%
  de un archivo", cuenta como archivo ausente) — el % de arriba es sobre el código
  que SÍ se cargó, no sobre el 100% del repositorio. Coherente con las rutas/paneles
  que la suite recorre (ver "Cobertura" más arriba): mucho se prueba end-to-end, pero
  hay pantallas y ramas de código (validaciones de formularios no probadas, estados de
  error de componentes concretos, etc.) que no se visitan nunca.
- Solo Chromium tiene esta API de cobertura (`page.coverage`) — no es portable a
  otros navegadores, pero esta suite ya corre solo en Chromium.

## Limitaciones conocidas (alcance acordado, no bugs)

- No se prueba ningún conector de BD externo con una conexión real (MySQL, Postgres,
  Oracle, MSSQL, ClickHouse, Vertica, MongoDB, Snowflake, BigQuery) — solo su manejo de
  errores. Si quieres cobertura de integración real contra alguno, dame acceso a una
  instancia de prueba y lo añado.
- No se invoca nunca al LLM real (Anthropic/OpenAI/Bedrock) para no gastar la API key en
  vivo — el frontend se prueba con la red mockeada.
- `snowflake` se omite en las pruebas de `check-connection` contra host inalcanzable: el
  SDK tarda varios minutos en rendirse (no es un problema de la app, es el propio driver).
- `/global/upload/addFile` (GeoJSON) y `POST /customHTML/:key` no exponen borrado por
  API, así que solo se prueban sus caminos de validación/permiso para no dejar datos sin
  forma de limpiar.
- Los tests de imagen de perfil (`uploads.spec.ts`, `profile.spec.ts`) suben una imagen
  al usuario admin de test; el archivo queda en `eda_api/lib/module/uploads/images/`
  (la app solo borra la imagen anterior de un usuario al subir una nueva, y cada run usa
  un usuario nuevo). Son archivos de ~70 bytes sin datos sensibles; si ejecutas la suite
  muchas veces y quieres limpiarlos, es seguro borrar a mano los que no reconozcas de esa
  carpeta.
