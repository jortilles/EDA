#!/bin/bash

# Función para mostrar mensajes
mostrar_mensaje() {
    if [ $1 -eq 0 ]; then
        echo -e "\e[32mÉxito: $2\e[0m"
    else
        echo -e "\e[31mError: $2\e[0m"
    fi
}

# Verifica la existencia de los archivos necesarios
if [ ! -f "angular.json" ] || [ ! -f "package.json" ]; then
    mostrar_mensaje 1 "No se encontraron angular.json y/o package.json en la ruta actual."
    exit 1
fi
# Lista de idiomas
IDIOMAS=("es" "ca" "en" "gl")


mostrar_mensaje $? "Restaurando angular.json a su estado original."
for IDIOMA in "${IDIOMAS[@]}"; do
    sed -i "s/\/prod_messages.$IDIOMA.xlf/\/messages.$IDIOMA.xlf/g" ./angular.json
done
