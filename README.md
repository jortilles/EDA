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
    url: "mongodb://127.0.0.1:27017/EDA"
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
```
## USE EDA

Just use it.... go to https://free.edalitics.com Edalitics is the SAAS jortilles provides over EDA. 

## Docker

The easiest way to run and try  EDA locally is using docker: 

```
docker run -p 80:80 jortilles/eda:latest
```

Once the process if finish, just go to **http://localhost**

* The default user is: **eda@jortilles.com**
* The default password is: **default**


Some of the dashboads  you can do with EDA: 

![EDA Sample](https://eda.jortilles.com/wp-content/uploads/2021/01/animaged4.gif)

How it works:
1. Create a [data model] (https://youtu.be/Px709s0ftiI)
2. Create nice  [reports] (https://youtu.be/RFznLe9kxHU)


## Documentation
You can find EDA's documentation at (http://edadoc.jortilles.com/en/index.html#/)





