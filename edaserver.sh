#!/bin/bash


echo "Creando un nuevo entorno de eda...."

echo url de la instancia... tipicamente mi_empresa?
read INSTANCIA


echo "creando la instancia de mongo...."


mongo --eval 'db.createCollection("users")' $INSTANCIA
mongo --eval 'db.createCollection("groups")' $INSTANCIA
mongo --eval 'db.createCollection("dashboard")' $INSTANCIA
mongo --eval 'db.createCollection("data-source")' $INSTANCIA
mongo --eval 'db.createCollection("files")' $INSTANCIA
mongo --eval 'db.createCollection("features")' $INSTANCIA
mongo --eval 'db.groups.insert( { "_id": ObjectId("135792467811111111111110"),  "role" : "EDA_ADMIN_ROLE", "name" : "ADMIN",  "users":[ ObjectId("135792467811111111111111")  ] }   )' $INSTANCIA
mongo --eval 'db.users.insert( { "_id" : ObjectId("135792467811111111111111"), "role" : [ ObjectId("135792467811111111111110") ], "name" : "EDA", "email" : "eda@jortilles.com", "password" : "$2a$10$J48xu5KAqobLzvD8FX1LOem7NZUMuXPHID1uSHzbzTbM.wGFPXjb2" } )' $INSTANCIA
mongo --eval ' db.users.insert( { "_id" : ObjectId("135792467811111111111112"),   "role" : [],    "name" : "edaanonim",    "email" : "edaanonim@jortilles.com",    "password" : "$2a$10$ziukAcgjgTe2XPmjO1xsruKJW1HlX0I2pvCiKZHQ69DdaCzgZA4/2" } ) ' $INSTANCIA






echo "Configurando la app......"
cp /opt/eda/eda_app/src/app/config/config.ts.edapi /opt/eda/eda_app/src/app/config/config.ts
sed -i 's/EDAPI/\/'$INSTANCIA'api/g' /opt/eda/eda_app/src/app/config/config.ts
echo "eda_app/src/app/config/config.ts queda así.... "
echo ""
cat /opt/eda/eda_app/src/app/config/config.ts
echo ""
echo "montando..."
echo ""	
cd /opt/eda/eda_app/
npm install
ng build --prod
echo "quitando el base href..."
sed -i 's/<base href="\/">/ /g' /opt/eda/eda_app/dist/app-eda/index.html
cp -r /opt/eda/eda_app/dist/app-eda /var/www/html/$INSTANCIA




echo "... Configurando la api...."
cp  /opt/eda/eda_api/config/database.config-dist.js /opt/eda/eda_api/config/database.config.js
sed -i 's/EDA/'$INSTANCIA'/g' /opt/eda/eda_api/config/database.config.js
echo "/opt/eda/eda_api/config/database.config.js queda así... "
echo ""
cat /opt/eda/eda_api/config/database.config.js
echo ""
echo "configurando puerto...."
base=`cat /opt/eda/api.port `
PUERTO=`expr $base + 1 `
echo $PUERTO > /opt/eda/api.port
PUERTO=`expr $PUERTO + 8000 `
echo "establenciendo el puerto a $PUERTO"

cp /opt/eda/eda_api/lib/server.ts.port  /opt/eda/eda_api/lib/server.ts
sed -i 's/APIPORT/'$PUERTO'/g' /opt/eda/eda_api/lib/server.ts
echo "el puerto queda así en /opt/eda/eda_api/lib/server.ts ..... "
echo ""
cat /opt/eda/eda_api/lib/server.ts
echo ""

echo "montando..."
cd /opt/eda/eda_api/
npm install
cp -r  /opt/eda/eda_api /opt/eda/$INSTANCIA
cd /opt/eda/$INSTANCIA
npm run start:forever


echo "configurando apache...."
lineas=`wc -l /etc/apache2/sites-available/000-default-le-ssl.conf | cut -f1 -d' '`
lineas=`expr $lineas - 2 `
head -$lineas /etc/apache2/sites-available/000-default-le-ssl.conf > /tmp/000-default-le-ssl.conf
echo  "ProxyPass \"/"$INSTANCIA"api/\"  \"http://localhost:"$PUERTO"/\" " >> /tmp/000-default-le-ssl.conf
echo  "ProxyPassReverse \"/"$INSTANCIA"api/\"  \"http://localhost:"$PUERTO"/\" " >> /tmp/000-default-le-ssl.conf
echo "</VirtualHost> " >> /tmp/000-default-le-ssl.conf
echo "</IfModule>" >> /tmp/000-default-le-ssl.conf
mv /etc/apache2/sites-available/000-default-le-ssl.conf /etc/apache2/sites-available/000-default-le-ssl.conf.$( date +"%Y-%m-%d_%H-%M-%S" )
cp /tmp/000-default-le-ssl.conf /etc/apache2/sites-available/
echo "El apache queda así...."
echo ""
cat /etc/apache2/sites-available/000-default-le-ssl.conf
echo ""


service apache2 restart

