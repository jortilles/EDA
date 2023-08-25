import { Request } from "express"
import { request } from "http"
import mongoose from "mongoose"

export class Connections {

  private conn ;

  //conector por url
  public connector(req: Request)  {
    const connector = {
      host: req.query.host,
      database: req.query.database,
      user: req.query.user,
      password: req.query.password,
      mongodb: "mongodb://sdauser:lkjukjgvtryyLIYYL@db.sinergiada.org:33219/" + req.query.mongodb  +  "?authSource=admin",
      // mongodb: "mongodb://myUserAdmin:Asaf--2020@dev.executionpro.com/reporting?authSource=admin",
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
      .then((c) =>{ this.conn=c; console.log("conectado a mongo")})
      .catch(err => console.log(err)) 
  }

  public async mongoEdaDisconnect() {
    await this.conn.disconnect().then(()=> console.log("Desconectado de mongo"))
  }

}
