from node:18-bullseye

# instalar
ENV DEBIAN_FRONTEND noninteractive

# Install mongodb
RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive  apt-get install -y wget git curl apt-transport-https ca-certificates apt-utils gnupg build-essential apache2  libaio1
RUN curl -fsSL https://pgp.mongodb.com/server-6.0.asc | gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg  --dearmor
RUN echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg] http://repo.mongodb.org/apt/debian bullseye/mongodb-org/6.0 main" |  tee /etc/apt/sources.list.d/mongodb-org-6.0.list 
RUN apt-get update
RUN apt-get install -y mongodb-org 

#Dependencias de chronium para el envio por correo
RUN apt-get install -y ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils 

 

# libreria de oracle
RUN echo "  "
RUN echo " la ubicacion de oracle sera /eda/oracle/instantclient "
RUN echo "  "
RUN echo "export LD_LIBRARY_PATH=/eda/oracle/instantclient" >/root/.bashrc

RUN echo n | npm install -g --silent @angular/cli
RUN npm install -g forever  forever-monitor nodemon http-server   
RUN npm install -g  --unsafe-perm puppeteer 


COPY /eda /eda
RUN chmod u+x /eda/docker_run.sh

# entrypoint
ENTRYPOINT /eda/docker_run.sh
