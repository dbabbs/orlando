const here = {
   id: 'Wf3z49YJK9ieJhsun9Wx',
   code: '8T7Stg2Jq1qvkfBn3Za4qw',
   apikey: 'EybNF4MkvcUj8WX1VJRKhT9dwDVz1wIHaKGF5tpqNss'
}
const style = 'reduced.night';

const hereTileUrl = `https://2.base.maps.api.here.com/maptile/2.1/maptile/newest/${style}/{z}/{x}/{y}/512/png8?app_id=${here.id}&app_code=${here.code}&ppi=320`;

const platform = new H.service.Platform({ apikey: here.apikey });
const defaultLayers = platform.createDefaultLayers();
const map = new H.Map(document.getElementById('map'), defaultLayers.vector.normal.map, {
   center: { lat: 28.1882447, lng: -81.1562729},
   zoom: 10,
   pixelRatio: window.devicePixelRatio || 1
});
const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
const provider = map.getBaseLayer().getProvider();
window.addEventListener('resize', () => map.getViewPort().resize());
const omvService = platform.getOMVService();

const isolineUrl = (center, range, mode = 'car', rangeType = 'distance') => 
`https://isoline.route.api.here.com/routing/7.2/calculateisoline.json
?app_id=${here.id}
&app_code=${here.code}
&mode=shortest;${mode};
traffic:${'enabled'}
&start=geo!${center.lat},${center.lng}
&range=${range}
&rangetype=${rangeType}`;

const slider = document.querySelector('#range');
slider.onchange = () => calculateIsoline();

const markers = [];
const polygons = [];
fetch('fire_stations.geojson')
.then(res => res.json())
.then(data => {
   data.features.forEach( feature => {
      const [lng, lat] = feature.geometry.coordinates;
      const marker = new H.map.Marker({lat, lng}, {volatility: true, data: feature.properties.jurisdiction});

      marker.draggable = true;
      markers.push(marker);
      // map.addObject(marker);
   });

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
   for (let i = 0; i < polygons.length; i++) {
      const j = polygons[i].getData();
      if (active.includes(j)) {
         polygons[i].setStyle({
            fillColor: 'rgba(74, 134, 255, 0.3)',
            strokeColor: '#4A86FF',
            lineWidth: 2
         })
      } else {
         polygons[i].setStyle({
            fillColor: 'rgba(74, 134, 255, 0.0)',
            strokeColor: '#4A86FF',
            lineWidth: 0
         })//hide
       }
   }
}
// const group = L.layerGroup().addTo(map);
let initial = true;
async function calculateIsoline() {
   // markers.forEach(m => map.removeObject(m));
   if (initial) {
      const lineTemp= new H.geo.LineString();
      lineTemp.pushLatLngAlt(0,0,0);
      lineTemp.pushLatLngAlt(1,1,0);
      markers.forEach((m, i) => {
         const polygon = new H.map.Polygon(lineTemp, {
            style: {
               fillColor: 'rgba(74, 134, 255, 0.3)',
               strokeColor: '#4A86FF',
               lineWidth: 2
            },
            data: m.getData()
         });
         polygons.push(polygon);
         map.addObject(polygon);
      })
      initial = false;
   }
   
   
   const range = document.querySelector('#range').value;
   const isolinePromises = markers.map(x => fetch(isolineUrl(x.getGeometry(), range)).then(res => res.json()));
   const responses = await Promise.all(isolinePromises);

   responses.forEach((x,i) => {
      const linestring = new H.geo.LineString();
      const shape = x.response.isoline[0].component[0].shape.map(z => z.split(','));
      shape.forEach(p => linestring.pushLatLngAlt.apply(linestring, p));
      polygons[i] = new H.map.Polygon(linestring, {
         style: {
            fillColor: 'rgba(74, 134, 255, 0.3)',
            strokeColor: '#4A86FF',
            lineWidth: 2
         },
         data: markers[i].getData()
      });
      filter();
   });
}


