const l = require('leaflet');
const topojson = require('topojson-client')


l.TopoJSON = l.GeoJSON.extend({
  addData: function(jsonData) {    
    if (jsonData.type === "Topology") {
      for (const key in jsonData.objects) {
        let geojson = topojson.feature(jsonData, jsonData.objects[key]);
        l.GeoJSON.prototype.addData.call(this, geojson);
      }
    }    
    else {
      l.GeoJSON.prototype.addData.call(this, jsonData);
    }
  }  
});

module.exports = l;  