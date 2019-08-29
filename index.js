const here = {
   id: 'Wf3z49YJK9ieJhsun9Wx',
   code: '8T7Stg2Jq1qvkfBn3Za4qw',
   apikey: 'EybNF4MkvcUj8WX1VJRKhT9dwDVz1wIHaKGF5tpqNss'
}
const style = 'reduced.day';

const colors = {
   exists: '#51A3DB',
   planned: '#FF7A8E',
   recommend: '#79F7CA',
}

document.querySelector('.sidebar-key').innerHTML = Object.keys(colors).map(key => 
   `<div><div class="square" style="background: ${colors[key]}"></div>${key}</div>`
).join('');
const hereTileUrl = `https://2.base.maps.api.here.com/maptile/2.1/maptile/newest/${style}/{z}/{x}/{y}/512/png8?app_id=${here.id}&app_code=${here.code}&ppi=320`;

const map = L.map('map', {
   center: [28.5906121, -81.5137384],
   zoom: 11,
   layers: [L.tileLayer(hereTileUrl)]
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
slider.onchange = () => refresh();

setRangeText();
function setRangeText() {
   const value = document.querySelector('#range').value;
   const miles = (Number(value) * 0.00062137).toFixed(1);
   document.querySelector('#range-text').innerText = miles + ' miles';
}

const points = [];
const polygons = [];

const pointLayer = L.layerGroup().addTo(map);
const polygonGroup = L.featureGroup().addTo(map);
const markerLayer = L.layerGroup().addTo(map)

fetch('fire_stations.geojson')
.then(res => res.json())
.then(data => {


   
   data.features.forEach(y => {
      const [lat, lng] = y.geometry.coordinates;
      const point = L.circleMarker([lng, lat],{
         radius: 3,
         fillColor: "#000",
         color: "#000",
         weight: 1,
         opacity: 1,
         fillOpacity: 0.8
     });
      point.jurisdiction = y.properties.jurisdiction;
      point.address = y.properties.address;
      point.status = y.properties.status;
      points.push(point);
   })
   // const geojson = new L.GeoJSON(data, {
   //    pointToLayer: function (feature, latlng) {
   //       return L.circleMarker(latlng, );
   //   }
   // }).addTo(geojsonLayer)
   

   const jurisdictions = [... new Set(
      data.features.map(x => x.properties.jurisdiction)
   )].sort();

   countStations(
      data.features.map(x => x.properties.jurisdiction)
   )

   jurisdictions.forEach(j => {
      const div = document.createElement('div');
      div.innerHTML = `
      <input id="${j}" type="checkbox" name="jurisdiction" class="filter" ${j === 'Orlando' ? "checked" : ''}>
      <label for="${j}">${j}</label>
      `
      document.querySelector('.filters').appendChild(div)
   })

   refresh()
   const filters = document.querySelectorAll('.filter');
   filters.forEach(f => f.onchange = (evt) => refresh())
});

const counter = {};
function countStations(stations) {
   
   stations.forEach(s => {
      counter[s] = counter[s] === undefined ? 1 : counter[s] + 1
   })

}




async function refresh() {
   const active = [...document.querySelectorAll('.filter:checked')].map(x => x.id);

   const activeCount = active.map(x => counter[x]).reduce((a,b) => a + b, 0);

   let stationText = '';
   if (active.length === 1) {
      stationText = active;
   } else {
      stationText = active.slice(0, active.length - 1).join(', ') + ' and ' + active[active.length -1]
   }
   document.querySelector('#num').innerHTML = `\
      ${stationText} 
      district${active.length === 1 ? '' : 's'} contain${active.length !== 1 ? '' : 's'} <span class="emphasis">${activeCount}</span> station${active.length == 1 && activeCount === 1 ? '' : 's'}.
   `


   polygonGroup.clearLayers();
   pointLayer.clearLayers();
   points.forEach(p => {
      if (active.includes(p.jurisdiction)) {
         
         p.addTo(pointLayer)
      }
   })


   
   const coordinates = pointLayer.getLayers()
      .filter(x => active.includes(x.jurisdiction))
      .map(
         x => ({
            jurisdiction: x.jurisdiction, 
            coordinates: [x._latlng.lat, x._latlng.lng],
            address: x.address,
            status: x.status
         })
      )

   const range = document.querySelector('#range').value;
   const isolinePromises = coordinates.map(x => fetch(isolineUrl(x.coordinates, range)).then(res => res.json()));
   const responses = await Promise.all(isolinePromises);

   responses.forEach((x,i) => {
      const shape = x.response.isoline[0].component[0].shape.map(z => z.split(','));
      const poly = L.polygon(shape, {color: colors[coordinates[i].status], weight: 2});

      poly.jurisdiction = coordinates[i].jurisdiction;
      poly.address = coordinates[i].address;
      poly.status = coordinates[i].status;
      poly.on('mouseover', function(e){

         L.popup({className: 'custom', closeButton: false})
            .setLatLng(e.latlng)
            .setContent(formatTooltip(poly))
            .openOn(map);
      });
      poly.on('mouseout', function (e) {
         map.closePopup();
      });
      poly.addTo(polygonGroup);
   });

   if (polygonGroup.getLayers().length > 0) {
      map.fitBounds(polygonGroup.getBounds());
   }
   
   
   setRangeText();

}


const geocodeUrl = (query) => `\
https://geocoder.api.here.com/6.2/geocode.json
?searchtext=${query}
&app_id=${here.id}
&app_code=${here.code}
&gen=9`;

document.querySelector('#go').onclick = async (evt) => {
   markerLayer.clearLayers();
   const value = document.querySelector('#address').value;
   const response = await fetch( geocodeUrl(value) ).then(res => res.json());
   const {Latitude, Longitude } = response.Response.View[0].Result[0].Location.DisplayPosition;
   L.marker([Latitude, Longitude]).addTo(markerLayer);
   map.flyTo([Latitude, Longitude], 15);
   document.querySelector('#clear').style.display = 'inline-block';
}
document.querySelector('#clear').onclick = () => {
   markerLayer.clearLayers();
   document.querySelector('#clear').style.display = 'none';
}

function formatTooltip({jurisdiction, address, status, _latlngs}) {
   // var polygon = turf.polygon([[[125, -15], [113, -22], [154, -27], [144, -15], [125, -15]]]);

   // var area = turf.area(polygon);
   const geojsonPolygon = turf.lineToPolygon(turf.lineString(_latlngs[0].map(x => [x.lng, x.lat])))

   const areaMilesSquared = turf.area(geojsonPolygon) / 2.59e+6;
   const html = `\
   <div><span class="key">Jurisdiction</span>${jurisdiction}</div>
   <div><span class="key">Address</span>${address}</div>
   <div><span class="key">Status</span>${status}</div>
   <div><span class="key">Area</span>${areaMilesSquared.toFixed(2)} miles^2</div>
   `
   return html;
}
