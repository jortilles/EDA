# EDA / Edalitics - Suite de testing (Playwright)

Suite de testing end-to-end (navegador real, Chromium) **y** de API HTTP para toda la
aplicación EDA, con Playwright. Cubre backend (`eda_api`) y frontend (`eda_app`) contra
una instancia real corriendo en local.

## Arranque rápido

```bash
# en otras dos terminales, deja corriendo:
cd eda/eda_api && npm run dev     # puerto 8666
cd eda/eda_app && npm start       # puerto 4200

cd eda/testing
npm install
npm run install:browsers   # una sola vez
cp .env.example .env       # y ajusta si hace falta (ver mas abajo)
npm test                   # corre TODO: API + navegador
```

- La API (`eda_api`, puerto fijo **8666**) y el frontend (`eda_app`, puerto **4200**)
  **debes arrancarlos tú** antes de `npm test` (`AUTO_START_API`/`AUTO_START_APP` estan
  a `false` por defecto -- ver hallazgo #5 más abajo sobre por qué el auto-arranque es
  arriesgado con `eda_api` en modo cluster). Si de verdad los quieres auto-arrancados,
  ponlos a `true` en `.env`, sabiendo que puede colisionar con una instancia ya corriendo.
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
npm run setup:ffmpeg     # OPCIONAL: descarga ffmpeg portable (~100MB, en .tools/, no sube a git)
                         # para recortar el arranque de Angular al inicio de cada video. Sin
                         # esto instalado, los tests funcionan igual, solo que el video no se
                         # recorta. Borra eda/testing/.tools/ para quitarlo.
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
- `AUTO_START_API` / `AUTO_START_APP`: `false` por defecto, asumen que tú ya tienes
  `eda_api`/`eda_app` corriendo (ver hallazgo #5 de por qué el auto-arranque es
  arriesgado).

## Hallazgos reales encontrados por esta suite

Construir esta suite sacó a la luz varios problemas reales de la aplicación (no de los
tests). Cada uno tiene un test dedicado que lo documenta explícitamente
(marcado `[hallazgo]` en el nombre) para que si algún día se corrige, el test empiece a
fallar y avise de que hay que actualizarlo:

**Ya corregidos** (se dejan documentados por el historial; los tests ya aseveran el
comportamiento correcto, no el bug):
- Fuga de la API key de IA a cualquier usuario autenticado via `GET /assistant/config`
  (le faltaba `roleGuard`). Test: `tests/api/assistant-and-mcp.spec.ts`.
- `/logs` sin control de acceso por rol, tanto en frontend (`pages.routes.ts`) como en
  API (`/admin/log/log-file`, `/admin/log/log-error-file`). Tests:
  `tests/e2e/permissions-ui.spec.ts`, `tests/api/logs.spec.ts`.

1. **[Fiabilidad, severidad alta] Un dashboard sin datasource real asociada rompe
   `DELETE /datasource/:id` para CUALQUIER datasource.** `DeleteDataSource`
   (`datasource.controller.ts` ~L355) hace `dashboards.filter(d => d.config.ds._id === ...)`
   sobre TODOS los dashboards de la base de datos sin comprobar que `config.ds` exista;
   si un solo dashboard tiene `ds` vacío o ausente, el borrado de cualquier datasource
   (no solo la suya) devuelve 500. El mismo patrón rompe `GET /dashboard/:id`
   (`dashboard.controller.ts` ~L564) para ESE dashboard en concreto. Reproducido y
   verificado manualmente durante la construcción de esta suite (y limpiado de la BBDD
   de dev en el proceso). Test: `tests/api/dashboards.spec.ts` (test `[hallazgo]`).

2. **[Fiabilidad, severidad media — peor de lo que parecía] `GET /datasource` no es
   solo lento: en la BBDD de dev actual tarda 20-30s y ACABA LANZANDO UN ERROR**
   (`{"status":404,"message":"Error loading DataSources"}`, el propio catch de
   `GetDataSources` en `datasource.controller.ts`), reproducido de forma consistente
   (curl y `fetch` directos, varias veces seguidas, con el backend limpio y sin otra
   carga). La causa es casi seguro que esta ruta hace `DataSource.find({})` **sin
   proyección** (trae el documento ENTERO de cada datasource, password incluido, para
   desencriptarla), mientras que `/datasource/names` (`_id` + `model_name` únicamente)
   responde en ~150ms contra la MISMA colección. Probablemente algún documento tiene un
   campo pesado/corrupto que hace que traer el documento completo sea muy costoso o
   falle. Esta suite ya no depende de esta ruta para nada que no sea tolerante a fallos
   (el teardown la usa en su barrido "best-effort", que no hace fallar la suite si
   falla) — el resto del código la evita a favor de `/datasource/names`.

3. **[Menor] El nombre/email del propio perfil no se sincroniza en el navegador tras
   guardar.** `user-profile.page.ts` (`saveUser()`) actualiza el usuario en el servidor
   vía `manageUpdateUsers()` pero nunca reescribe `localStorage["user"]` (a diferencia
   del login, que sí lo hace en `savingStorage()`). El cambio se guarda correctamente en
   la base de datos, pero la sesión del propio navegador sigue mostrando el nombre
   antiguo hasta el próximo login. Test: `tests/e2e/profile.spec.ts` (test `[hallazgo]`).

4. **[Menor, UI] Primer click "perdido" en botones de fila justo tras filtrar una
   tabla.** En `/admin/users` y `/admin/groups`, justo después de que el filtro de
   búsqueda re-renderice una fila (`@for` de Angular), el primer click sobre un botón de
   esa fila (borrar, editar) a veces no llega a disparar su `(click)` — sin excepciones,
   sin efecto visible más allá del foco. Un segundo click siempre funciona. Los tests
   correspondientes lo compensan (`tests/fixtures/ui-helpers.ts:clickUntilSwalConfirm`),
   pero un usuario real podría experimentar el mismo click "que no hace nada".

5. **[Fiabilidad, severidad alta] `AUTO_START_API=true` puede tumbar el backend.**
   `eda_api` corre en modo cluster (master + 4 workers sobre el puerto fijo 8666,
   `lib/server.ts`). Cuando ya hay una instancia corriendo y la suite intenta
   reutilizarla (`reuseExistingServer: true`), una condicion de carrera en el
   healthcheck puede hacer que Playwright arranque una SEGUNDA instancia de todos
   modos; sus workers chocan por el puerto, entran en un bucle de crash/reinicio
   (`[Cluster] Worker N terminó (code: 7)... Reiniciando...`), y bajo la carga de
   la suite completa (navegador + API en paralelo) ese bucle llegó a tumbar
   tambien la instancia original -- reproducido durante la construccion de esta
   mejora. Por eso `AUTO_START_API`/`AUTO_START_APP` estan a `false` por defecto:
   arranca `eda_api` y `eda_app` tu mismo antes de `npm test`. Test: ninguno
   dedicado (es un problema de arranque, no de un endpoint), documentado aqui y
   en `.env.example`.

6. **[Fiabilidad, severidad media] `/admin/alerts-management` hace una llamada por
   cada dashboard existente (N+1).** `alerts-management.component.ts:initDashboards()`
   llama a `getDashboards()` y luego a `getDashboard(id)` individualmente por CADA
   dashboard devuelto, en vez de pedir de una vez los datos que necesita. En la BBDD
   de dev real (100+ dashboards) la pagina tarda varios segundos en asentarse y la red
   nunca llega a quedar inactiva dentro de un timeout razonable. El test de navegacion
   lo tolera (ver `tests/e2e/navigation-home.spec.ts`, ya no usa `networkidle`) pero la
   pagina en si merece revision si se usa con datos reales grandes.

7. **[Entorno de desarrollo, no es bug] "Crear nuevo informe"/navegar a un dashboard
   falla intermitentemente por caché de Vite desactualizada.** Diagnosticado con
   logging temporal de red/consola del navegador: `POST /dashboard` responde 201 (el
   dashboard SÍ se crea), pero al navegar a `/dashboard/:id` el `ng serve` (Vite) del
   dev server devuelve `504 Outdated Optimize Dep` para el chunk lazy
   (`dashboard.page-*.js`), y el `import()` dinámico de Angular falla
   (`TypeError: Failed to fetch dynamically imported module`), dejando la app en
   `/home`. Vite invalida su caché de dependencias pre-empaquetadas ("Re-optimizing
   dependencies...") cada vez que cambia su config o hay suficientes cambios de
   fichero; en una sesión larga con muchas ediciones (como la que originó esta mejora),
   un `ng serve` que lleva horas abierto puede quedar en este estado para chunks
   nuevos/poco visitados. **No es un bug de la app ni de los tests** — un `ng serve`
   recién arrancado no lo reproduce. Mismo síntoma explica el fallo intermitente de
   `tests/e2e/dashboard-charts.spec.ts` (también navega a `/dashboard/:id`). Si este
   test falla así, reinicia `ng serve` antes de sospechar de la app.

8. **[Menor, higiene de i18n] El catálogo de traducción catalán tiene `<source>`
   desactualizados respecto al código fuente actual.** Angular liga las traducciones
   por ID (`@@chartTypes6`), así que la app en sí traduce bien en runtime, pero el
   `<source>` grabado en `messages.ca.xlf` no se actualiza solo cuando alguien
   corrige un texto en el `.ts`/`.html` sin volver a extraer/mergear el catálogo.
   Casos reales encontrados construyendo `dashboard-charts.spec.ts`:
   `chart-utils.service.ts:81` tiene `"Gráfico de Barras Apiladas"` pero el xlf aún
   graba el typo histórico `"Gráfico de Barras Apliadas"`; `chartTypes13` es
   `"Treemap"` en el código pero el test (y a primera vista, cualquiera) esperaría
   `"TreeMap"`. `utils/locale-catalog.ts` ya lo tolera (lookup insensible a
   mayúsculas + una excepción documentada para el typo), pero sería buena higiene
   correr `npm run i18n:merge` en `eda_app` para resincronizar el catálogo.

9. **[Menor, fiabilidad] "Tabla DataQuality" cierra el editor de consulta antes de
   confirmar.** A diferencia de TODOS los demás tipos de gráfico, elegir "Tabla
   DataQuality" en el desplegable cierra el editor de consulta al instante —
   `eda-blank-panel.component.ts` (`changeChartTypeCheck`, ~L911-940) llama a
   `this.closeEditarConsulta()` en la misma línea síncrona en la que se abre
   `Swal.fire(...).then(...)`, sin esperar la respuesta del usuario. Efecto real: si el
   usuario pulsa "Cancelar" en el Swal de confirmación, el editor se cierra igual,
   perdiendo la consulta que estuviera configurando sin ningún motivo (para el resto de
   tipos, cancelar no cierra nada). Test:
   `tests/e2e/dashboard-charts.spec.ts` (`[hallazgo]`, al final del archivo).

10. **[Fiabilidad, severidad media] Elegir un tipo de gráfico justo tras abrir la
    pestaña "Vista previa" puede no aplicarse — sin error, sin aviso.** Reproducido de
    forma aislada y repetible: el mismo click, sobre la misma opción del desplegable
    `#chartSelector`, falla en el primer intento y funciona en un segundo intento
    inmediatamente después (misma consulta, mismos campos). El desplegable se queda
    mostrando el tipo anterior (típicamente "Tabla de Datos", el primero de la lista)
    sin ningún toast ni Swal que lo indique. Es una carrera real de la app, no un
    problema de qué campos se eligen: `changeChartTypeCheck`/`changeChartType`
    (`eda-blank-panel.component.ts` ~L1076-1131) comprueban de forma síncrona, dentro
    del handler `(onChange)` del `p-dropdown`, si el tipo elegido sigue siendo válido
    contra `this.chartTypes` — justo tras cambiar de pestaña esa lista no siempre
    parece estar ya asentada. Construir el recorrido masivo de tipos de gráfico de
    `dashboard-charts.spec.ts` lo disparaba sistemáticamente (hasta 14 de 30 tipos mal
    aplicados en una sola ejecución); el test ahora reintenta la selección verificando
    el valor realmente mostrado (`selectChartType()`, con margen y varios intentos)
    antes de continuar, y lanza un error explícito si nunca llega a aplicarse — no deja
    pasar un tipo incorrecto en silencio. Mismo mecanismo probablemente explica por qué
    el `#chartSelector` aparece duplicado en el DOM (`id="chartSelector"` x2,
    posiblemente una variante responsive oculta) — no se ha investigado más a fondo.

11. **[Menor, UI] "Editar opciones del gráfico" puede abrir el diálogo equivocado en un
    panel recién creado en la misma sesión.** El mismo ítem de menú decide a qué
    diálogo abrir (gráfico/tabla/KPI/...) según `panelComponent.graficos.chartType`
    (`panel-menu-options.ts:editChart`); en un panel creado hace muy poco sin recargar
    página, ese campo a veces no está sincronizado todavía y abre "Propiedades de la
    tabla" en vez de "Propiedades del gráfico" aunque el panel sí sea un gráfico real.
    Se detecta por el título del diálogo abierto y se reintenta (cerrando con el botón
    de cancelar, más fiable que Escape) en `tweakChartOptions()`.

12. **[Menor, UI] El diálogo del menú "..." de un panel ("OPCIONS DEL PANELL") puede
    renderizarse parcial o totalmente fuera del viewport para paneles cerca del borde
    izquierdo del dashboard.** Comprobado directamente (`boundingBox()` con `x`
    negativo) en el primer panel de un dashboard recién creado: un click normal de
    Playwright sobre cualquier ítem del menú falla con "Element is outside of the
    viewport" incluso con `force: true` (que sí evita otras comprobaciones de
    visibilidad, pero no esta). Por eso todos los clicks sobre este menú en toda la
    suite usan `.evaluate(el => el.click())` en vez de un click normal. No se ha
    investigado la causa de fondo (¿el `p-dialog` calcula su posición a partir del
    punto de click sin hacer *clamping* a los bordes de la ventana?), pero es
    reproducible y afectaría igual a un usuario real con un panel en esa posición.

13. **[Menor, UI] El texto del menú "..." no se refresca tras "Bloquear panel".**
    Ni en el mismo menú (que queda abierto — el comando no llama a
    `hideContextMenu()`) ni reabriéndolo desde cero muestra "Desbloquear panel"
    después de bloquear. El bloqueo en sí **sí se aplica correctamente**
    (`panel.dragEnabled`/`resizeEnabled` pasan a `false`, verificado vía el JSON
    guardado) — es solo que `p-panelMenu` no parece reaccionar bien a que
    `panelComponent.contextMenu.contextMenuItems` se reasigne a un array nuevo
    mientras el diálogo ya está abierto (`toggleLock()` en `panel-menu-options.ts`).

14. **[Menor, UI] Justo después de que termine una descarga (Exportar a Excel/CSV),
    el siguiente click en el icono "..." del panel no reabre el menú.** Reproducido
    de forma aislada: el mismo click, sobre el mismo panel, falla sin esperar tras la
    descarga y funciona a la primera esperando ~1.5s. Probablemente la propia
    descarga del navegador roba el foco un instante. `dashboard-charts.spec.ts`
    espera antes de encadenar un segundo export justo después del primero.

15. **[Fiabilidad, severidad media] "Vincular con otro informe" dispara un `GET
    /dashboard/:id` en paralelo de TODOS los dashboards visibles del usuario, sin
    cancelarlo si el diálogo se cierra antes de que termine.** `initDashboards()`
    en `link-dashboards.component.ts` hace `Promise.allSettled(dashboards.map(d =>
    getDashboard(d._id)))` sobre `private + group + open + common` — en este
    entorno de desarrollo, confirmado vía API, eso son **~350 peticiones en
    paralelo** (la mayoría dashboards reales, no basura de tests). Esa ráfaga sigue
    corriendo de fondo mucho después de cerrar el diálogo y compite por el mismo
    servidor Node con cualquier otra acción posterior: se ha visto (confirmado con
    traza de Playwright: el `PUT /dashboard/:id` de un guardado real quedaba sin
    respuesta más de 20s) que retrasa lo suficiente un guardado de dashboard
    inmediatamente posterior como para que su toast de éxito no dé tiempo a
    aparecer dentro de un timeout normal. `dashboard-charts.spec.ts` espera a que
    la ráfaga se asiente (`networkidle`, hasta 60s) antes de guardar justo después
    de usar esta opción.

16. **[Entorno de desarrollo, no es bug de la app] Esta BBDD de desarrollo compartida
    acumula un volumen real de datos considerable.** Confirmado vía API: ~350
    dashboards (270 privados + 7 de grupo + 20 abiertos + 55 comunes) y
    `GET /datasource` tarda >30s y devuelve 404 (mismo síntoma que el hallazgo #2,
    ahora cuantificado). De esos ~350 dashboards, solo ~49 tenían prefijo
    `PWTEST_` (basura de ejecuciones de test interrumpidas cuyo teardown no llegó a
    correr — el barrido de `global.teardown.ts` solo limpia el prefijo de la
    propia ejecución, no el de ejecuciones anteriores); el resto (~300) es
    contenido real de desarrollo/demo, no se debe tocar sin confirmar antes. Si el
    entorno se nota lento en general, merece la pena revisar y limpiar
    manualmente los dashboards/datasources con prefijo `PWTEST_` antiguos.

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
de 30 de los 31 tipos de gráfico que ofrece la aplicación**, más 2 paneles extra de
"Gráfico de Barras" (uno por cada pestaña de colores, ver más abajo) — **32 paneles en
total** (tablas, KPIs, circulares, barras, líneas, dispersión, embudo, radar, mapas de
árbol, etc. — la lista completa vive en `services/utils/chart-utils.service.ts:chartTypes`),
comprueba que ninguno da error, guarda el dashboard entero, recarga la página y confirma
que los 32 paneles persisten.
Cada panel se titula con el nombre de su tipo de gráfico (p.ej. "Gráfico de Barras
Apiladas"), para poder identificarlos a simple vista sin tener que abrir cada uno.
"Texto Dinámico" limita la consulta a "Mostrar Top: 1" (si no, al agrupar por una sola
columna categórica sin agregación numérica, la consulta devuelve una fila por cada valor
distinto y el widget, que solo puede mostrar uno, queda ambiguo).

Tras crear los 30 y guardar, recorre los 20 tipos que tienen diálogo propio "Editar
opciones del gráfico" (`exerciseDisplayOptions()`) y activa/rellena cada opción presente
para ESE tipo (cada tipo solo muestra un subconjunto — leyenda, animación, líneas guía,
segundo eje, etiquetas ajustables, radio interno, Top N, límites del velocímetro, color
semafórico, etc. — vía `@if (features.xxx)` en `chart-dialog.component.html`; la función
no necesita saber cuál, solo comprueba si el control existe antes de tocarlo). No toca a
propósito: el grupo mutuamente excluyente Tendencia/Comparativa/Predicción (activar una
deshabilita las otras dos, así que "tocarlas todas" no tiene un estado final coherente) ni
"Añadir imágenes" (abre el selector de la librería de medios). Verificado panel a panel en
el JSON guardado: cada ajuste aparece exactamente donde corresponde según el feature-set
real de ese tipo (p.ej. segundo eje solo en "Mixto: Barras y lineas", radio interno solo
en "Gráfico de Pastel", Top N/transición/línea de tiempo solo en "Barras en carrera",
límites/semáforo solo en "Velocímetro").

Para cada uno de esos 20 tipos, `exerciseColorOptions()` también ejerce la sección
"Colores" de forma genérica (no exhaustiva: es la parte más subjetiva/cosmética del
diálogo y su UI es bastante más frágil que los interruptores simples del resto): escoge
la primera paleta del desplegable si existe, cambia el primer color individual a amarillo
y, si el tipo tiene opacidad, la sube al 50%. Los 2 paneles extra de "Gráfico de Barras"
(el único tipo con pestañas de intervalo) cubren además, uno cada uno, sus 3 pestañas de
color ("Colores" / "Colores Únicos" / "Colores por intervalo").

Después también edita el tipo de gráfico de un panel ya existente (menú del panel ->
"Cambiar tipo de gráfico") y borra otro panel, guardando y verificando cada cambio. Un
test aparte (`repasa el resto de opciones del menú contextual del panel`) cubre el resto
de opciones del menú "..." de un panel que no tocan los anteriores: Editar estilo del
panel, Mostrar campos de origen, Vincular con otro informe (smoke test: abre y cierra sin
confirmar), Exportar a Excel/CSV, Duplicar panel y Bloquear panel (verificado vía el JSON
guardado, no vía el texto del menú — ver hallazgo #13).

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
