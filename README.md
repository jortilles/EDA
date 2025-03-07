# EDA 

Enterprise Data Analytics by  [Jortilles](http://eda.jortilles.com)! The easiest analytics tool.

![EDA Sample](https://eda.jortilles.com/wp-content/uploads/2021/01/animaged4.gif)


## Get Started.

The free EDA cloud: [free.edalitics](https://free.edalitics.com) is the easiest way to get started with EDA. If you like it you can always ugrade to a  [private edalitics instance](https://www.edalitics.com/en/edalitics-3/#como-tenerlo). Edalitis is the cloud service over EDA.

## Features
  * Create amazing dashboards without technical knowledge. 
  * If you are a pro. You always can use SQL.
  * Tree mode queries for complex data models.
  * Define KPIs and send email alerts.
  * With the public dashboards you can:
    * Share your dashboards on internet as easy as share the [url](https://demoeda.jortilles.com/es/#/public/61a0f5fdb9314109a45ff077) 
    * Integrate your dashboards in your app and itenract with them.
  * Define parent-child reports.
  * Centraliza your organization's data with Row Level Security.


## Get EDA locally

### Clone EDA

```bash
git clone github.com/jortilles/EDA.git
```

### Configuration

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

### Installation

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

## Docker

The easiest way to run and try  EDA locally is using docker: 

```
docker run -p 80:80 jortilles/eda:latest
```

Once the process if finish, just go to **http://localhost**

* The default user is: **eda@jortilles.com**
* The default password is: **default**


Some of the dashboads  you can do with EDA: 

![EDA Sample](https://www.edalitics.com/wp-content/uploads/2023/02/SuiteCRMUserPerformance.jpeg)

![EDA Samplt](https://www.edalitics.com/wp-content/uploads/2022/03/woocommerce_sales.png)



How it works:
1. Create a [data model] (https://youtu.be/Px709s0ftiI)
2. Create nice  [reports] (https://youtu.be/RFznLe9kxHU)


## Documentation
You can find EDA's documentation at (http://edadoc.jortilles.com/en/index.html#/)





