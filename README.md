# EDA 

Enterprise Data Analytics by  [Jortilles](http://eda.jortilles.com)! The easiest analytics tool.

## Installation

Clone this repository and then build the API and APP.

```bash
cd eda_api
npm install
```

```bash
cd eda_app
npm install
```

## Configuration

* eda_api/config/database.config.js #to set the mongodb database

```
module.exports = {
    url: "mongodb://localhost:27017/EDA"
};

```

* eda_app/src/app/config/config.ts #to set the backend url

```
export const URL_SERVICES = '/localhost:8666'; #by default api port is 8666

```

## Demo

The easiest way to run and try eda is using docker option.

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