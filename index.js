import Search from './Search.js';
import { here } from './here.js'
new Search();

const style = 'reduced.day';

const colors = {
   exists: a => `rgba(101,99,226, ${a})`,
   planned: a => `rgba(255, 122, 142, ${a})`,
   recommend: a =>  `rgba(121, 247, 202, ${a})`,
}

const pinColor = 'black'; //'#C92B2E'

const labels = {
   exists: 'Existing station range',
   planned: 'Planned station range',
   recommend: 'Recommended future station range'
}



document.querySelector('.sidebar-key').innerHTML = Object.keys(colors).map(key => 
   `<div class="key-item"><div class="square" style="border: 1px solid ${colors[key](1)}; background: ${colors[key](0.3)};"></div>${labels[key]}</div>`
).join('');
document.querySelector('.sidebar-key').innerHTML += 
`<div class="key-item"><div class="circle" style="background: ${pinColor}"></div>Station location</div>`

const hereTileUrl = `https://2.base.maps.api.here.com/maptile/2.1/maptile/newest/${style}/{z}/{x}/{y}/512/png8?app_id=${here.id}&app_code=${here.code}&ppi=320`;


const tangram = Tangram.leafletLayer({
   scene: 'scene.yaml'
})

const map = L.map('map', {
   center: [28.5906121, -81.5137384],
   zoom: 11,
   layers: [tangram],
   zoomControl: false
});
map.attributionControl.addAttribution('Tangram | &copy; HERE 2019');

L.control.zoom({
   position: 'bottomright'
}).addTo(map)

const isolineUrl = (center, range, rangeType, mode = 'car') => 
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

const rangeTypeButtons = document.querySelectorAll('.range-type');
rangeTypeButtons.forEach(t => t.onchange = () => refresh())

slider.oninput = setRangeText;

setRangeText();
function setRangeText() {
   const rangeType = document.querySelector('#time').checked ? 'time' : 'distance';
   const value = document.querySelector('#range').value;
   if (rangeType === 'distance') {
      const miles = (Number(value) * 0.00062137).toFixed(1);
      document.querySelector('#range-text').innerText = miles + ' miles';
   } else {
      const minutes = Number.isInteger(Number(value / 60)) ? Number(value / 60) : (Number(value) / 60).toFixed(1);
      document.querySelector('#range-text').innerText = minutes + ' mins';
   }
   
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
         fillColor: pinColor,
         color: pinColor,
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
      div.classList.add('filter-item');
      div.innerHTML = `
      
      <label for="${j}">
      <input id="${j}" type="checkbox" name="jurisdiction" class="filter" ${j === 'Orlando' ? "checked" : ''}>
      ${j}
      </label>
      `
      document.querySelector('.filter-items').appendChild(div)
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
   openLoading();
   const active = [...document.querySelectorAll('.filter:checked')].map(x => x.id);

   const activeCount = active.map(x => counter[x]).reduce((a,b) => a + b, 0);

   let stationText = '';
   if (active.length === 1) {
      stationText = active;
   } else {
      stationText = active.slice(0, active.length - 1).join(', ') + ' and ' + active[active.length -1]
   }
   // document.querySelector('#num').innerHTML = `\
   //    ${stationText} 
   //    district${active.length === 1 ? '' : 's'} contain${active.length !== 1 ? '' : 's'} <span class="emphasis">${activeCount}</span> station${active.length == 1 && activeCount === 1 ? '' : 's'}.
   // `
   document.querySelector('#num').innerHTML = `<span class="emphasis">${active.length}</span> station${active.length === 1 ? '' : 's'} visible in the map view.`;
   updateFilterText(active);


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
   const rangeType = document.querySelector('#time').checked ? 'time' : 'distance';

   setMax(rangeType);
   setRangeText();
   const isolinePromises = coordinates.map(x => fetch(isolineUrl(x.coordinates, range, rangeType)).then(res => res.json()));
   const responses = await Promise.all(isolinePromises);

   responses.forEach((x,i) => {
      const shape = x.response.isoline[0].component[0].shape.map(z => z.split(','));
      const poly = L.polygon(shape, {color: colors[coordinates[i].status](1), weight: 2});

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
      map.flyToBounds(polygonGroup.getBounds(), {padding: [0, 100]});
   }
   
   // setRangeText();
   closeLoading();

}

function addMarker(latitude, longitude) {
   markerLayer.clearLayers();
   L.marker([latitude, longitude]).addTo(markerLayer);
   map.flyTo([latitude, longitude], 15);
}


function formatTooltip({jurisdiction, address, status, _latlngs}) {
   const geojsonPolygon = turf.lineToPolygon(turf.lineString(_latlngs[0].map(x => [x.lng, x.lat])))
   const areaMilesSquared = turf.area(geojsonPolygon) / 2.59e+6;
   return `\
   <div><span class="key">Jurisdiction</span>${jurisdiction}</div>
   <div><span class="key">Address</span>${address}</div>
   <div><span class="key">Status</span>${status}</div>
   <div><span class="key">Area</span>${areaMilesSquared.toFixed(2)} miles^2</div>`
}
let filterOpen = false;


document.querySelector('.filters').onclick = () => {
   filterOpen = !filterOpen;
   if (filterOpen) {
      openFilter();
   } else {
      closeFilter();
   }
}



function closeFilter() {
   document.querySelector('.filters img').style.transform ='rotate(-180deg)';
   document.querySelector('.filter-items').style.height = '0px';
}

let maxHeight = '200px';
let initial = true;
function openFilter() {

   if (initial) {
      initial = false;
      const filterItems = document.querySelector('.filter-items');

      const y = filterItems.getBoundingClientRect().y;

      maxHeight = `calc(100vh - ${y}px - var(--larger-spacing) * 2)`;
   }
   document.querySelector('.filters img').style.transform ='';
   document.querySelector('.filter-items').style.height = maxHeight;
   

}

function updateFilterText(active) {
   const text = active.join(', ');
   if (active.length === 0) {
      document.querySelector('.filter-text').innerText = 'No jurisdictions selected';
   } else if (text.length <= 32) {
      document.querySelector('.filter-text').innerText = text;
   } else {
      document.querySelector('.filter-text').innerText = active.length + ' jurisdiction' + (active.length > 1 ? 's' : '') + ' selected';
   }
}

document.body.onkeydown = (evt) => {
   const { key } = evt;
   if (key === 'Escape') {
      closeFilter();
   }
}

function openLoading() {
   document.querySelector('#loading-container').style.opacity = 1;
}

function closeLoading() {
   document.querySelector('#loading-container').style.opacity = 0;
}


function setMax(rangeType) {
   if (rangeType === 'time') {
      document.querySelector('#range').max = 600;
   } else if(rangeType === 'distance') {
      document.querySelector('#range').max = 6000;
   }
}

document.querySelector('#select-all').onclick = () => {
   const filters = document.querySelectorAll('.filter');
   filters.forEach(f => {
      f.checked = true;
   });
   console.log(filters);
   refresh();
}

document.querySelector('#select-none').onclick = () => {
   const filters = document.querySelectorAll('.filter');
   filters.forEach(f => {
      f.checked = false;
   });
   console.log(filters);
   refresh();
}

// const filterItems = document.querySelector('.filter-items');
// console.log(
//    filterItems.getBoundingClientRect()
// )
// filterItems.style.height = '300px';


export { addMarker };