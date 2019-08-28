const here = {
   id: 'Wf3z49YJK9ieJhsun9Wx',
   code: '8T7Stg2Jq1qvkfBn3Za4qw',
   apikey: 'EybNF4MkvcUj8WX1VJRKhT9dwDVz1wIHaKGF5tpqNss'
}
const style = 'reduced.night';

const hereTileUrl = `https://2.base.maps.api.here.com/maptile/2.1/maptile/newest/${style}/{z}/{x}/{y}/512/png8?app_id=${here.id}&app_code=${here.code}&ppi=320`;

const key = 'YOUR-API-KEY';
const tangram = Tangram.leafletLayer({
   scene: 'scene.yaml'
})

const scene = tangram.scene;

const map = L.map('map', {
   center: [28.5906121, -81.5137384],
   zoom: 11,
   layers: [tangram]
});
map.attributionControl.addAttribution('&copy; HERE 2019');

const isolineUrl = (center, range, mode = 'car', rangeType = 'distance') => 
`https://isoline.route.api.here.com/routing/7.2/calculateisoline.json
?app_id=${here.id}
&app_code=${here.code}
&mode=shortest;${mode};
traffic:${'enabled'}
&start=geo!${center[0]},${center[1]}
&range=${range}
&rangetype=${rangeType}`;

const slider = document.querySelector('#range');
slider.onchange = () => calculateIsoline();

setRangeText();
function setRangeText() {
   const value = document.querySelector('#range').value;
   const miles = (Number(value) * 0.00062137).toFixed(1);
   document.querySelector('#range-text').innerText = miles;
}

const markers = [];
const polygons = [];

const geojsonLayer = L.layerGroup();//.addTo(map);
fetch('fire_stations.geojson')
.then(res => res.json())
.then(data => {

   const markers = [];
   data.features.forEach(y => {
      const [lat, lng] = y.geometry.coordinates
      const marker = L.marker([lng, lat]);
      marker.jurisdiction = y.properties.jurisdiction;
      markers.push(marker);
      marker.addTo(geojsonLayer);
   })
   // const geojson = new L.GeoJSON(data).addTo(geojsonLayer)
   

   const jurisdictions = [... new Set(
      data.features.map(x => x.properties.jurisdiction)
   )];

   jurisdictions.forEach(j => {
      const div = document.createElement('div');
      div.innerHTML = `
      <input id="${j}" type="checkbox" name="jurisdiction" class="filter" checked>
      <label for="${j}">${j}</label>
      `
      document.querySelector('.filters').appendChild(div)
   })

   calculateIsoline()
   const filters = document.querySelectorAll('.filter');
   filters.forEach(f => f.onchange = (evt) => filter(evt))
});




function filter(evt) {

   const active = [...document.querySelectorAll('.filter')].filter(x => x.checked).map(x => x.id);
   
   const polys =  polygonGroup.getLayers();
   for (i  = 0; i < polys.length; i++) {
      // console.log(polys[i].jurisdiction)
   }
}

const polygonGroup = L.layerGroup().addTo(map);

let loaded = false;
tangram.scene.subscribe({
   load: (scene) => {
      console.log('loaded')
      loaded = true;
      // scene.setDataSource('isolines', { type: 'GeoJSON', data});
   }
})

async function calculateIsoline() {
   const geoJsonPolygons = [];
   polygonGroup.clearLayers();

   const coordinates = geojsonLayer.getLayers().map(
      x => ({jurisdiction: x.jurisdiction, coordinates: [x._latlng.lat, x._latlng.lng]})
   )

   const range = document.querySelector('#range').value;
   const isolinePromises = coordinates.map(x => fetch(isolineUrl(x.coordinates, range)).then(res => res.json()));
   const responses = await Promise.all(isolinePromises);

   responses.forEach((x,i) => {
      const shape = x.response.isoline[0].component[0].shape.map(z => z.split(','));
      const poly = L.polygon(shape, {color: '#5DDCCF', weight: 2});
      poly.jurisdiction = coordinates[i].jurisdiction


      // poly.addTo(polygonGroup);
      
      
      const geoPolygon = turf.polygon([
         
      ])
      geoJsonPolygons.push(shape.map(x => [Number(x[1]), Number(x[0])]))

      


   });

   

   const data = {
      type: 'FeatureCollection',
      features: geoJsonPolygons.map(x => ({
         geometry: {
            type: 'Polygon',
            coordinates: [x]
         },
         type: "Feature",
         properties: {}
      }))
   }

   if (loaded) {
      console.log('added')
      scene.setDataSource('isolines', { type: 'GeoJSON', data});
   }
   console.log(scene);
   
   
   
   filter();
   setRangeText();

}

