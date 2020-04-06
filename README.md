# EDA 

Enterprise Data Analytics by  [Jortilles](http://eda.jortilles.com) 

EDA is the easiest analytics tool.

To build EDA just:

cd eda_api
npm install

cd eda_app
npm install


Configuration is done in:

* eda_api/config/database.config.js to set the mongodb database
* eda_app/src/app/config/config.ts to set the backend url

The easies way to test eda is using docker: 

**docker run -p 80:80 jortilles/eda:eda_1.2.2**

Once the process if finish, just go to **http://localhost**

* The default user is: **eda@jortilles.com**
* The default password is: **default**

Easily, you can do dashboads as nice as this one: 

![EDA Sample](https://eda.jortilles.com/wp-content/uploads/2020/04/ejemplo_demo_venta.png)

You can see it in action [here](https://www.youtube.com/watch?v=7KxIgob78Cg)
