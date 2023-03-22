import { Request } from "express"
import { request } from "http"
import mongoose from "mongoose"

export class Connections {


  //conector por url
  public connector(req: Request)  {
    const connector = {
      host: req.query.host,
      database: req.query.database,
      user: req.query.user,
      password: req.query.password,
      mongodb: /* introduce mongo uri*/  + req.query.mongodb.toString(),
      connectionLimit: 10 ,
      waitForConnections: true,
      queueLimit: 0
      
    }

    return connector
  }

  //conector de bbdd de EDA
  public async mongoEdaConnect(req: Request): Promise<void>  {  
  mongoose.set('strictQuery', false)
  let con = this.connector(req).mongodb
  await mongoose.connect(con, {})
      .then(() => console.log("conectado a mongo"))
      .catch(err => console.log(err)) 
  }

  public async mongoEdaDisconnect() {
    await mongoose.disconnect().then(()=> console.log("Desconectado de mongo"))
  }

}