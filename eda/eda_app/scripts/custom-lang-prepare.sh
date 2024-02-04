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

LOCALES_PATH="src/locale"

# Lista de idiomas
IDIOMAS=("es" "ca" "en" "gl")

# Ejecutar comandos y verificar si se ejecutan con éxito
for IDIOMA in "${IDIOMAS[@]}"; do
    rm $LOCALES_PATH/prod_messages.$IDIOMA.xlf
    xliff-simple-merge -i $LOCALES_PATH/messages.$IDIOMA.xlf $LOCALES_PATH/stic_messages.$IDIOMA.xlf -d $LOCALES_PATH/prod_messages.$IDIOMA.xlf -w
    mostrar_mensaje $? "Procesamiento de stic_messages.$IDIOMA.xlf completado."

    # Buscar y reemplazar en angular.json
    sed -i "s/\/messages.$IDIOMA.xlf/\/prod_messages.$IDIOMA.xlf/g" ./angular.json
    mostrar_mensaje $? "Actualizando angular.json para [$IDIOMA]."
done



