# EDA 

Enterprise Data Analytics by  [Jortilles](http://eda.jortilles.com)! The easiest analytics tool.


## Get EDA

```bash
git clone github.com/jortilles/EDA.git
```

## Configuration

* EDA/eda/eda_api/config/database.config.js #to set the mongodb database. You need a local mongodb server and a database for EDA. 

```
module.exports = {
    url: "mongodb://localhost:27017/EDA"
};

```

* EDA/eda/eda_app/src/app/config/config.ts #to set the backend url

```
export const URL_SERVICES = '/localhost:8666'; #by default api port is 8666

```

## Installation

Once cloned this repository and configured just build the API and the APP.

```bash
cd EDA/eda/eda_api
npm install
npm start
```

```bash
cd EDA/eda/eda_app
npm install
npm start


## Demo

The easiest way to run and try EDA  is using docker: 

```
docker run -p 80:80 jortilles/eda:latest
```


Once the process if finish, just go to **http://localhost**

* The default user is: **eda@jortilles.com**
* The default password is: **default**

Easily, you can do dashboads as nice as this one: 

![EDA Sample](https://eda.jortilles.com/wp-content/uploads/2020/04/ejemplo_demo_venta.png)

You can see it in action [here](https://www.youtube.com/watch?v=S0wkoeRqz3k&t=5s)

## Technical Documentation
To see the technical documentation click [here](docs/technical-docs.md) 
