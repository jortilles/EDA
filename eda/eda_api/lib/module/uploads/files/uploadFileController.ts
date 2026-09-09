
import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import GeoJsonFeature, { IgeoJsonFeature } from './feature.model';
import GeoJsonFile, { IGeoJsonFile } from './files.model';

var fs = require('fs');

//Convert GeoJson to TopoJson
const geostitch = require('d3-geo-projection').geoStitch
const topoJson = require('topojson-server');
const topojsonSimplify = require('topojson-simplify');

// Fraction of the lowest-weight vertices dropped when simplifying (0 = no simplification, 1 = degenerate).
// Uploaded GeoJSON is often digitized for full-screen use (tens of MB); Edalitics renders it inside
// small dashboard panels, so most of that detail is invisible. 0.35 keeps shapes visually equivalent
// at panel size while cutting stitch/transfer/render cost significantly.
const SIMPLIFY_QUANTILE = 0.35;

// Stitches raw GeoJSON features into a topology and simplifies it. Done once (at upload, or on first
// read for legacy maps) instead of on every request, since the result is identical until the map is re-uploaded.
function buildTopology(features: Array<any>, id: string) {
  const geoJsonFile = { id, type: 'FeatureCollection', features };
  const topology = topoJson.topology(geostitch({ foo: geoJsonFile }));
  const presimplified = topojsonSimplify.presimplify(topology);
  const minWeight = topojsonSimplify.quantile(presimplified, SIMPLIFY_QUANTILE);
  return topojsonSimplify.simplify(presimplified, minWeight);
}

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

    // Precompute and cache the topology now, so every future read serves this instead of
    // re-stitching/re-simplifying from the raw features on each request.
    try {
      file.topology = buildTopology(req.body.features, String(file._id));
      await file.save();
    } catch (err) {
      // Non-fatal: readGeoJsonFile computes and caches it lazily on first read if this is missing.
    }

    const newfile = req.body; newfile._id = file._id;
    return res.status(201).json({ ok: true, file:newfile });
  }

  static readGeoJsonFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fileDoc = await GeoJsonFile.findById(req.params.id);

      if (fileDoc && fileDoc.topology) {
        return res.status(200).json({ ok: true, file: fileDoc.topology });
      }

      // Legacy map uploaded before this cache existed (or the precompute above failed once):
      // build it here and persist it so every subsequent read hits the cached branch above.
      const mongoFeatures = await GeoJsonFeature.find({ featureCollection: req.params.id });
      const features = mongoFeatures.map(f => f.feature);
      const topoData = buildTopology(features, req.params.id);

      if (fileDoc) {
        fileDoc.topology = topoData;
        fileDoc.save().catch(() => { /* served below regardless; will retry caching on next read */ });
      }

      return res.status(200).json({ ok: true, file: topoData });

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