#!/bin/bash

mkdir -p /eda/mongo/data
mongod --dbpath eda/mongo/data  --fork --logpath eda/mongo/log


mongo --eval 'db.createCollection("users")' EDA
mongo --eval 'db.createCollection("groups")' EDA
mongo --eval 'db.createCollection("dashboard")' EDA
mongo --eval 'db.createCollection("data-source")' EDA
mongo --eval 'db.users.insert( { "role" : "ADMIN_ROLE", "name" : "EDA", "email" : "eda@jortilles.com", "password" : "$2a$10$/2ZNBtq/KvyrTdpJ5OAvge6Wey1htz42u/drF8m/71PHGvU8TlqVq"} )' EDA

cd /eda/eda_api
npm install
npm start >/eda/eda_api/api.log 2>&1  &


cd /eda/eda_app/
npm install
ng build --prod
cd /eda/eda_app/dist/app-eda/
pwd
echo "Starting EDA"
http-server .
