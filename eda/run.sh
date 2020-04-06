#!/bin/bash

echo "arrancando la api"

cd eda_api

nohup npm start &

echo "arrancando la app"
cd ..
cd eda_app/dist/app-eda

nohup  http-server  -p 8686 .  &

