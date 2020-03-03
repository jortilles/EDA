#!/bin/bash

echo "----------------------------------------------------------------------------------------"
echo "                                                                                        "
echo "Recuerda que debes haber configurado correctamente   eda_api/config/database.config.js  " 
echo "                                                                                        "
echo "----------------------------------------------------------------------------------------"

echo "instalando...."

npm install

echo "arrancando.... " 

nohup npm start &

