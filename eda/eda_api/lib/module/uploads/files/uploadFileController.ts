import { createCipheriv } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import GeoJsonFeature, { IgeoJsonFeature } from './feature.model';
import GeoJsonFile, { IGeoJsonFile } from './files.model';

var fs = require('fs');

//Convert GeoJson to TopoJson
const geostitch = require('d3-geo-projection').geoStitch
const topoJson = require('topojson-server');


export class UploadFileController {

  static uploadFile = async (req: Request, res: Response, next: NextFunction) => {
    let file = null;
    try {
      const fileToSave: IGeoJsonFile = new GeoJsonFile({ file: req.body.type });
      file = await fileToSave.save();
    } catch (err) {
      return next(new HttpException(400, 'Some error ocurred while saving file'));
    }

    for(let i = 0; i < req.body.features.length; i++){
      let savedFeature = null;
      try {
        const new_feature = {
          feature: req.body.features[i],
          featureCollection: file._id
        }
        const feature: IgeoJsonFeature = new GeoJsonFeature(new_feature);
        savedFeature = feature.save();        
      } catch (err) {
        return next(new HttpException(400, 'Some error ocurred while saving file'));
      }
    }
    const newfile = req.body; newfile._id = file._id;
    return res.status(201).json({ ok: true, file:newfile });
  }

  static readFile = async (req: Request, res: Response, next: NextFunction) => {
    let features : Array<any>;
    try {

      const mongoFeatures = await GeoJsonFeature.find({ featureCollection: req.params.id });
      features = mongoFeatures.map(f => f.feature);
      const geoJsonFile  =  {id:req.params.id, type: "FeatureCollection", features:features};
      const topoData = topoJson.topology(geostitch({foo:geoJsonFile}));
      return res.status(200).json({ ok: true, file:topoData });

    } catch (e) {
      return next(new HttpException(404, 'Feature not found'));
    }
  }
  static uploadBigQueryCredentials = async ( req: Request, res: Response, next: NextFunction ) => {

    try{
      
      fs.writeFile(`lib/files/${req.body.project_id}.json`,  JSON.stringify(req.body), 'utf8', ()=>{
        return res.status(200).json({ ok: true, file:req.body });
      });
      

    }catch(err){
      return next(new HttpException(404, 'Error saving keys'));
    }
    
  }
  
}