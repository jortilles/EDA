#!/bin/bash

mkdir -p /eda/mongo/data
mongod --dbpath eda/mongo/data  --fork --logpath eda/mongo/log


mongo --eval 'db.createCollection("users")' EDA
mongo --eval 'db.createCollection("groups")' EDA
mongo --eval 'db.createCollection("dashboard")' EDA
mongo --eval 'db.createCollection("data-source")' EDA
mongo --eval 'db.groups.insert( { "_id": ObjectId("135792467811111111111110"),  "role" : "ADMIN_ROLE", "name" : "ADMIN",  "users":[ ObjectId("135792467811111111111111")  ] }   )' EDA
mongo --eval 'db.users.insert( { "_id" : ObjectId("135792467811111111111111"), "role" : [ ObjectId("135792467811111111111110") ], "name" : "EDA", "email" : "eda@jortilles.com", "password" : "$2a$10$/2ZNBtq/KvyrTdpJ5OAvge6Wey1htz42u/drF8m/71PHGvU8TlqVq" } )' EDA




cd /eda/eda_api
npm install
npm start >/eda/eda_api/api.log 2>&1  &


cd /eda/eda_app/
npm install
ng build --prod


a2enmod proxy
a2enmod proxy_http
a2enmod proxy_ajp
a2enmod rewrite
a2enmod deflate
a2enmod headers
a2enmod proxy_balancer
a2enmod proxy_connect
a2enmod proxy_html

cp -r /eda/eda_app/dist/app-eda /var/www
cp /eda/000-default.conf /etc/apache2/sites-available/

service apache2 restart

tail -f /eda/eda_api/api.log







cd /eda/eda_app/dist/app-eda/
pwd
echo "Starting EDA"
http-server .


