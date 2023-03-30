import fs from 'fs'
import { Connections } from '../config/connections'
import mongoose, { mongo, Mongoose } from 'mongoose'
import { Request, Response } from 'express'
import { DashBoard } from '../database/models/dashboard'


export class reportLoader {

    //en este método inyectamos los informes descargados por los usuarios a nuestro mongo db
    public static async reportLoader(req: Request) {
        
        // read a dashboard file from local source
        //leemos del directorio fuente 
        let files = fs.readdir('./reports_to_load', async (err, files) => {
            if (err) throw err
            //por cada archivo le aplicamos la lógica
            files.forEach(async file => {

                const dashBoardData = fs.readFileSync('./reports_to_load/' + file).toString()
                const dashBoardDataJSON = JSON.parse(dashBoardData)


                /* OJO A LAS CONEXIONES!!! BLOQUEAR LA CONEXIÓN Y DESCONEXIÓN SI PASAMOS A USAR ESTE SERVICIO EN EL MODELO PRINCIPAL*/
                try {
                    await new Connections().mongoEdaConnect(req)
                } catch (err) {
                    if (err) throw err
                    console.log("no conectado")
                } finally {

                }
               
                const DashBoardEda = await new DashBoard().dashboard()

                // aqui le decimos que si no existe el dashboard, que lo guarde, y si existe, que lo actualice
                const data = await new DashBoardEda(dashBoardDataJSON)
                const dataFound = await DashBoardEda.findById(data._id)
                if (!dataFound) {
                    data.save()
                    console.log("dashboard " + data._id + " saved")
                } else {
                    await DashBoardEda.findByIdAndUpdate({ _id: data._id }, data)
                    console.log("dashboard " + data._id + " updated")
                }

            });


        })
        /* OJO A LAS CONEXIONES!!! BLOQUEAR LA CONEXIÓN Y DESCONEXIÓN SI PASAMOS A USAR ESTE SERVICIO EN EL MODELO PRINCIPAL*/
        try {
            await new Connections().mongoEdaDisconnect()
        } catch (err) {
            if (err) throw err
            console.log("no desconectado")
        } finally {
            console.log("------------desconectado a mongo-----------------")
        }


    
    
    }

    //en este método pretendemos 
    public static async syncroInforms(req: Request, res: Response) {

        let reqParams = {       
            mongodb:  req.query.mongodb.toString(),
            mongodestiny: req.query.mongodb.toString(),
            informe: req.query.informe.toString()
        }       
   
        try {
            if (reqParams) {
                
                const connectMongoOrigin = await new Connections().mongoEdaConnect(req)
                console.log("........................conectado a mongo.....................")
                
                const DashBoardEda = await new DashBoard().dashboard()

                const found = await DashBoardEda.findById(req.query.informe)
                
                console.log(found)

                const disconnectMongoOrigin = await new Connections().mongoEdaDisconnect()
                console.log("........................desconectado de mongo.....................")

                if (found) {
                    mongoose.set('strictQuery', false)
                    let con =   req.query.mongodb.toString() 
                    await mongoose.connect(con, {})
                        .then(() => console.log("conectado a mongo"))
                        .catch(err => console.log(err))


                    const DashBoardEdaDestiny = await new DashBoard().dashboard()

                    try {
                        const data = await new DashBoardEdaDestiny(found)
                        await data.save()
                    } catch (err) {
                        console.log("Informe ya existente")
                    } finally {
                        await DashBoardEdaDestiny.findByIdAndUpdate({_id:found._id},{config:found.config} )
                    }
                    
                    await mongoose.disconnect().then(() => console.log("Desconectado de mongo"))


                    console.log("Informe " + req.query.informe.toString() + " actualizado")
                    res.send("Informe " + req.query.informe.toString()+ " actualizado")

                } else {
                    console.log("Informe  " + req.query.informe.toString() + " no encontrado")
                    res.send("Informe  " + req.query.informe.toString() + " no encontrado")

                }

            } else {
                console.log("Datos incorrectos")
                res.send("Datos incorrectos")
            }

        } catch (err) {
            console.log(err)

        } finally {
            
        }
      
    } 

}