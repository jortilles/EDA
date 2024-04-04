# Sinergia Data Analytics (SinergiaDA) 

Sinergia Data Analytics [SinergiaTIC](https://sinergiacrm.org/es/sinergia-data-analytics/) es una herramienta de análisis de datos que se integra de forma automática con SinergiaCRM


## Instalar SinergiaDA
Para comenzar la instalación de SinergiaDA en tu servidor, el primer paso es clonar el repositorio de GitHub en la raíz de alojamiento. Generalmente, este directorio es `/var/www/html/<dominio>/public_html/`. Utiliza el siguiente comando para realizar la clonación mediante HTTPS:

```bash
git clone https://github.com/SinergiaTIC/SinergiaDA.git sinergiada
```

## SinergiaDA tiene dos partes bien diferenciadas la API (backend) y la APP (frontend).
- Los ficheros del backend están situados en ./sinergiada/eda/eda_api 
- Los ficheros del frontend están en ./sinergiada/eda/eda_app


### Configuración del backend - API

1. **Modificar el fichero de configuración de la base de datos:** Para configurar la conexión a la base de datos MongoDB, se debe modificar el fichero `./sinergiada/eda/eda_api/database.config.js`, incluyendo los datos de conexión adecuados:

   ```javascript
   module.exports = {
      url: "mongodb://usuario:contraseña@localhost:27017/SDA"
   };
   ```

2. **Configurar los proxies para la API:** Es necesario configurar los proxies para permitir la comunicación correcta entre el frontend y el backend a través del puerto por defecto, que es el 8666. Para ello, se deben añadir las siguientes líneas en el fichero de configuración de Apache para el vhost:

   ```
   ProxyPass "/edapi/" "http://localhost:8666/"
   ProxyPassReverse "/edapi/" "http://localhost:8666/"
   ```

3. **Recargar la configuración de Apache:** Para que los cambios surtan efecto, es necesario recargar la configuración de Apache con el siguiente comando:

   ```bash
   sudo systemctl reload apache2.service
   ```

4. **Descargar paquetes y dependencias:** Desde la carpeta de la API `./sinergiada/eda/eda_api`, ejecutar el siguiente comando para instalar las dependencias necesarias:

   ```bash
   npm install
   ```

5. **Instalar el gestor de instancias de Node, PM2:** Si PM2 no está disponible en el equipo, se debe instalar globalmente con el siguiente comando:

   ```bash
   npm install pm2 -g
   ```

6. **Arrancar la API con PM2:** Para iniciar la API utilizando PM2, ejecutar:

   ```bash
   npm run start:pm2
   ```

7. **Configurar las credenciales de acceso a la base de datos de SinergiaCR:** Se deben indicar las credenciales de acceso en el fichero `./sinergiada/eda/eda_api/config/sinergiacrm.config.js`, reemplazando los valores existentes por las credenciales válidas.

8. **Configurar la semilla aleatoría (salt)** que será usada para cifrar los datos en la base de datos de MongoDB y en las comunicaciones enter la instancia de SinergiaCRM y SinergiaDA. 
Este cambio debe hacerse en el fichero `./sinergiada/eda/eda_api/config/seed.js` y debe añadirse una cadena personalizada del siguiente modo
```javascript
module.exports.SEED = '<custom-salt-string>';
```
Esta misma cadena deberá ser configurada más tarde en la instancia de SinergiaCRM.


### Configuración del frontend -APP

1. **Descargar paquetes y dependencias:**
   - Navegar a la carpeta del frontend:
     ```bash
     cd ./sinergiada/eda/eda_app
     ```
   - Instalar las dependencias necesarias:
     ```bash
     npm install --legacy-peer-deps
     ```

2. **Compilar la app:**
   - Ejecutar el siguiente comando para compilar la aplicación. Esto generará la carpeta `./sinergiada/eda/eda_app/dist/app-eda/`, que contendrá una carpeta por cada idioma con la aplicación del backend:
     ```bash
     npm run build:prod
     ```

3. **Proteger el acceso a los ficheros fuente de la aplicación mediante un fichero `.htaccess` que debe tener el siguiente contenido:**
   ```
   RewriteEngine On
   RewriteRule ^sinergiada($|/) - [R=403,L]
   ```
   Verificar **que no es posible acceder** mediante el navegador a la url http(s)://<servidor>/sinergiada/...

4. **Crear enlaces simbólicos en la raíz del host para cada uno de los idiomas y para el fichero `index.html`:**
   - Situarse en la raíz del host y ejecutar:
     ```bash
     ln -s ./sinergiada/eda/eda_app/dist/app-eda/index.html index.html
     ln -s ./sinergiada/eda/eda_app/dist/app-eda/en en
     ln -s ./sinergiada/eda/eda_app/dist/app-eda/es es
     ln -s ./sinergiada/eda/eda_app/dist/app-eda/ca ca
     ln -s ./sinergiada/eda/eda_app/dist/app-eda/gl gl
     ```

   En este punto, en la dirección de vhost debe verse la pantalla de login en el idioma del navegador.

### Comunicar SinergiaDA con SinergiaCRM
Para que SinergiaDA pueda utilizar los datos de SinergiaCRM, debe realizarse varias  acciones:
   1. **En SinergiaCRM:** 
      - **Habilitada la conexión con SinergiaDA**, lo cual debe hacerse añadiendo al fichero `config_override.php` las siguientes líneas:
         ```php
         $sugar_config['stic_sinergiada']['enabled'] = true;$sugar_config['stic_sinergiada_public']['url']='https://<sinergiada_host>'
         $sugar_config['stic_sinergiada']['seed_string'] = '<custom-salt-string>';
         ```
      - Ejecutar el proceso de reconstrucción de fuentes de datos, lo que preparará las vistas y tablas necesarias en MySQL para que sean consumidas por SinergiaDA. Estas vistas y tablas tienen como prefijo `sda_` por lo que no puede haber en el servidor objetos que comiencen por este prefijo, ya que serían borradas. Para lanzarlo usar la siguiente URL, con un usuario administrador de SinergiaCRM: 
      `https://<sinergiacrm_host>/index.php?module=Administration&action=createReportingMySQLViews&debug=1&update_model=1&print_debug=1&rebuild_filter=all`

En este punto, el backend de SinergiaDA debería poder conectar con SinergiaCRM para utilizarlos como una fuente de datos y poder generar informes con los datos de SinergiaCRM.

## Documentación de usuarios
Puede consultarse la documentación de SinegiaDA en https://wiki.sinergiacrm.org





