from node:buster

# instalar
ENV DEBIAN_FRONTEND noninteractive

# Install mongodb
RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive  apt-get install -y wget git curl apt-transport-https ca-certificates apt-utils gnupg
RUN wget -qO - https://www.mongodb.org/static/pgp/server-4.2.asc | apt-key add -
RUN echo "deb http://repo.mongodb.org/apt/debian buster/mongodb-org/4.2 main" | tee /etc/apt/sources.list.d/mongodb-org-4.2.list
RUN apt-get update
RUN apt-get install -y mongodb-org build-essential apache2  libaio1
RUN echo "export LD_LIBRARY_PATH=/eda/oracle/instantclient" >/root/.bashrc

RUN echo n | npm install -g --silent @angular/cli
RUN npm install -g forever  forever-monitor nodemon http-server

COPY /eda /eda
RUN chmod u+x /eda/docker_run.sh

# entrypoint
ENTRYPOINT /eda/docker_run.sh


