#!/bin/bash

if [ -d /eda/mongo/data ]
then
        eda_installed=true
else

        eda_installed=false
        mkdir -p /eda/mongo/data
fi

if pgrep -x "mongod" >/dev/null
then
        echo "mongo is running"
else
        echo "start mongo"
        mongod --dbpath eda/mongo/data  --fork --logpath eda/mongo/log
fi

echo "Asumiendo que los paquetes ya están descargados y instalados"


if ! $eda_installed
then
        mongosh --eval 'db.createCollection("users")' EDA
        mongosh --eval 'db.createCollection("groups")' EDA
        mongosh --eval 'db.createCollection("dashboard")' EDA
        mongosh --eval 'db.createCollection("data-source")' EDA
        mongosh --eval 'db.createCollection("files")' EDA
        mongosh --eval 'db.createCollection("features")' EDA
        mongosh --eval 'db.groups.insertOne( { "_id": ObjectId("135792467811111111111110"), "role": "EDA_ADMIN_ROLE", "name" : "EDA_ADMIN",  "users":[ ObjectId("135792467811111111111111")  ] }   )' EDA
        mongosh --eval 'db.groups.insertOne( { "_id": ObjectId("135792467811111111111113"), "role": "EDA_USER_ROLE", "name" : "EDA_RO",  "users":[] } )' EDA
        mongosh --eval 'db.groups.insertOne( { "_id": ObjectId("135792467811111111111115"), "role": "EDA_USER_ROLE", "name" : "EDA_DATASOURCE_CREATOR",  "users":[] } )' EDA
        mongosh --eval 'db.users.insertOne( { "_id" : ObjectId("135792467811111111111111"), "role" : [ ObjectId("135792467811111111111110") ], "name" : "EDA", "email" : "eda@jortilles.com", "password" : "$2a$10$J48xu5KAqobLzvD8FX1LOem7NZUMuXPHID1uSHzbzTbM.wGFPXjb2" } )' EDA
        mongosh --eval ' db.users.insertOne( { "_id" : ObjectId("135792467811111111111112"),   "role" : [],    "name" : "edaanonim",    "email" : "edaanonim@jortilles.com",    "password" : "$2a$10$ziukAcgjgTe2XPmjO1xsruKJW1HlX0I2pvCiKZHQ69DdaCzgZA4/2" } ) ' EDA

        npm install -g pm2 nodemon http-server

        export LD_LIBRARY_PATH=/eda/oracle/instantclient

        a2enmod proxy
        a2enmod proxy_http
        a2enmod proxy_ajp
        a2enmod rewrite
        a2enmod deflate
        a2enmod headers
        a2enmod proxy_balancer
        a2enmod proxy_connect
        a2enmod proxy_html
        a2dismod -f autoindex


        cd /eda/eda_app/
        npm install
        npm run build:prod
        rm  -rf /var/www/html
        cp -r  /eda/eda_app/dist/app-eda  /var/www/html
        cp   /eda/000-default.conf /etc/apache2/sites-available
fi

if pgrep -x "apache2" > /dev/null
then
        echo "apache is running"
else
        echo "start apache"
        service apache2 start
fi

if ! $eda_installed
then
        cd /eda/eda_api
 #       npm install
fi

if [ $(pm2 pid server)  -gt 0 ]
then
        echo "node is running"
else
        echo "start node"
        cd /eda/eda_api
        npm run start:pm2
fi

echo ""
echo "----------------------------------------------"
echo ""
echo ""
echo "usuario eda@jortilles.com"
echo "password default"
echo ""
echo ""

tail -f /dev/null
root@dev.jortilles.com:/opt/eda/manual/EDA# docker add  eda/docker_run_manual.sh
docker: unknown command: docker add

Run 'docker --help' for more information
root@dev.jortilles.com:/opt/eda/manual/EDA# git  add  eda/docker_run_manual.sh
root@dev.jortilles.com:/opt/eda/manual/EDA# git commit -m "Docker manual"
[master 6d82a803] Docker manual
 Committer: root <root@vps-fa5a6b9f.vps.ovh.net>
Your name and email address were configured automatically based
on your username and hostname. Please check that they are accurate.
You can suppress this message by setting them explicitly:

    git config --global user.name "Your Name"
    git config --global user.email you@example.com

After doing this, you may fix the identity used for this commit with:

    git commit --amend --reset-author

 1 file changed, 1 insertion(+)
root@dev.jortilles.com:/opt/eda/manual/EDA#   git config --global user.name "Your Name"
root@dev.jortilles.com:/opt/eda/manual/EDA#   git config --global user.name "Juanjo Ortilles"
root@dev.jortilles.com:/opt/eda/manual/EDA# git push
Username for 'https://github.com': juanjo^C
root@dev.jortilles.com:/opt/eda/manual/EDA# ^C
root@dev.jortilles.com:/opt/eda/manual/EDA# ^C
root@dev.jortilles.com:/opt/eda/manual/EDA# cat eda/docker_run_manual.sh
#!/bin/bash

if [ -d /eda/mongo/data ]
then
        eda_installed=true
else

        eda_installed=false
        mkdir -p /eda/mongo/data
fi

if pgrep -x "mongod" >/dev/null
then
        echo "mongo is running"
else
        echo "start mongo"
        mongod --dbpath eda/mongo/data  --fork --logpath eda/mongo/log
fi

echo "Asumiendo que los paquetes ya están descargados y instalados"


if ! $eda_installed
then
        mongosh --eval 'db.createCollection("users")' EDA
        mongosh --eval 'db.createCollection("groups")' EDA
        mongosh --eval 'db.createCollection("dashboard")' EDA
        mongosh --eval 'db.createCollection("data-source")' EDA
        mongosh --eval 'db.createCollection("files")' EDA
        mongosh --eval 'db.createCollection("features")' EDA
        mongosh --eval 'db.groups.insertOne( { "_id": ObjectId("135792467811111111111110"), "role": "EDA_ADMIN_ROLE", "name" : "EDA_ADMIN",  "users":[ ObjectId("135792467811111111111111")  ] }   )' EDA
        mongosh --eval 'db.groups.insertOne( { "_id": ObjectId("135792467811111111111113"), "role": "EDA_USER_ROLE", "name" : "EDA_RO",  "users":[] } )' EDA
        mongosh --eval 'db.groups.insertOne( { "_id": ObjectId("135792467811111111111115"), "role": "EDA_USER_ROLE", "name" : "EDA_DATASOURCE_CREATOR",  "users":[] } )' EDA
        mongosh --eval 'db.users.insertOne( { "_id" : ObjectId("135792467811111111111111"), "role" : [ ObjectId("135792467811111111111110") ], "name" : "EDA", "email" : "eda@jortilles.com", "password" : "$2a$10$J48xu5KAqobLzvD8FX1LOem7NZUMuXPHID1uSHzbzTbM.wGFPXjb2" } )' EDA
        mongosh --eval ' db.users.insertOne( { "_id" : ObjectId("135792467811111111111112"),   "role" : [],    "name" : "edaanonim",    "email" : "edaanonim@jortilles.com",    "password" : "$2a$10$ziukAcgjgTe2XPmjO1xsruKJW1HlX0I2pvCiKZHQ69DdaCzgZA4/2" } ) ' EDA

        npm install -g pm2 nodemon http-server

        export LD_LIBRARY_PATH=/eda/oracle/instantclient

        a2enmod proxy
        a2enmod proxy_http
        a2enmod proxy_ajp
        a2enmod rewrite
        a2enmod deflate
        a2enmod headers
        a2enmod proxy_balancer
        a2enmod proxy_connect
        a2enmod proxy_html
        a2dismod -f autoindex


        cd /eda/eda_app/
        npm install
        npm run build:prod
        rm  -rf /var/www/html
        cp -r  /eda/eda_app/dist/app-eda  /var/www/html
        cp   /eda/000-default.conf /etc/apache2/sites-available
fi

if pgrep -x "apache2" > /dev/null
then
        echo "apache is running"
else
        echo "start apache"
        service apache2 start
fi

if ! $eda_installed
then
        cd /eda/eda_api
 #       npm install
fi

if [ $(pm2 pid server)  -gt 0 ]
then
        echo "node is running"
else
        echo "start node"
        cd /eda/eda_api
        npm run start:pm2
fi

echo ""
echo "----------------------------------------------"
echo ""
echo ""
echo "usuario eda@jortilles.com"
echo "password default"
echo ""
echo ""

tail -f /dev/null
