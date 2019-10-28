import Search from './Search.js';
import { colors, pinColor, scene, credentials } from './config.js';
import { isolineUrl } from './here.js';
import { $, $$, openLoading, closeLoading, setMax, openFilter, 
   closeFilter, updateFilterText, initializeSidebar, setRangeText
} from './helpers.js';

const map = L.map('map', {
   center: [28.480057258090312, -81.35272980000002],
   zoom: 11,
   layers: [Tangram.leafletLayer({ scene })],
   zoomControl: false
});
map.attributionControl.addAttribution('<a href="https://https://tangrams.readthedocs.io/en/latest/">Tangram</a> | &copy; <a href="https://developer.here.com">HERE 2019</a>');
L.control.zoom({ position: 'bottomright' }).addTo(map);

new Search();
initializeSidebar();

const slider = $('#range');
slider.onchange = () => refresh('slider');
slider.oninput = setRangeText;

$$('.range-type').forEach(t => t.onchange = () => refresh('range-type'))
setRangeText();

const points = [];
const pointLayer = L.layerGroup().addTo(map);
const polygonGroup = L.featureGroup().addTo(map);
const markerLayer = L.layerGroup().addTo(map)

async function start() {
   const url = `https://xyz.api.here.com/hub/spaces/${credentials.xyzId}/search?access_token=${credentials.xyzToken}`;
   const data = await fetch(url).then(res => res.json());
   
   data.features.forEach(y => {
      const [lat, lng] = y.geometry.coordinates;
      const point = L.circleMarker([lng, lat], {
         radius: 3,
         fillColor: pinColor,
         color: 'white',
         weight: 3,
         opacity: 1,
         fillOpacity: 0.8
      });
      point.jurisdiction = y.properties.jurisdiction;
      point.address = y.properties.address;
      point.status = y.properties.status;
      point.name = y.properties.station;
      points.push(point);
   });
   
   const jurisdictions = [... new Set(data.features.map(x => x.properties.jurisdiction))]
      .sort();

   countStations(data.features.map(x => x.properties.jurisdiction))

   jurisdictions.forEach(j => {
      const div = document.createElement('div');
      div.classList.add('filter-item');
      div.innerHTML = `
      <label for="${j}">
         <input id="${j}" type="checkbox" name="jurisdiction" class="filter" ${j === 'Orlando' ? "checked" : ''}>
         ${j}
      </label>`
      $('.filter-items').appendChild(div)
   })

   refresh();
   const filters = $$('.filter');
   filters.forEach(f => f.onchange = () => refresh());
}

start();

const counter = {};
function countStations(stations) {
   stations.forEach(s => counter[s] = counter[s] === undefined ? 1 : counter[s] + 1)
}

async function refresh(from = 'filter') {
   openLoading();
   const active = [...$$('.filter:checked')].map(x => x.id);

   const activeCount = active.map(x => counter[x]).reduce((a,b) => a + b, 0);

   $('#num').innerHTML = `<span class="emphasis">${activeCount}</span> station${activeCount === 1 ? '' : 's'} visible in the map view.`;
   updateFilterText(active);

   polygonGroup.clearLayers();
   pointLayer.clearLayers();
   points.forEach(p => {
      if (active.includes(p.jurisdiction)) {
         p.addTo(pointLayer)
      }
   });

   const coordinates = pointLayer.getLayers()
      .filter(x => active.includes(x.jurisdiction))
      .map(x => ({
         jurisdiction: x.jurisdiction, 
         coordinates: [x._latlng.lat, x._latlng.lng],
         address: x.address,
         status: x.status,
         name: x.name
      }))

   const range = $('#range').value;
   const rangeType = $('#time').checked ? 'time' : 'distance';

   setMax(rangeType);
   setRangeText();
   const isolinePromises = coordinates.map(x => fetch(isolineUrl(x.coordinates, range, rangeType)).then(res => res.json()));
   const responses = await Promise.all(isolinePromises);


   const output = {
      type: 'FeatureCollection',
      features: []
   }
   responses.forEach((x,i) => {
      const shape = x.response.isoline[0].component[0].shape.map(z => z.split(','));
      const poly = L.polygon(shape, {
         color: colors[coordinates[i].status](1), 
         fillOpacity: 0.2,
         weight: 2
      });

      poly.jurisdiction = coordinates[i].jurisdiction;
      poly.address = coordinates[i].address;
      poly.status = coordinates[i].status;
      poly.name = coordinates[i].name;

      const popup = L.popup({className: 'custom', closeButton: false});
      poly.bindPopup(popup);

      poly.on('click', e => {
         e.target.setStyle({ fillOpacity: 0.4 })
         const popup = e.target.getPopup();
         popup.setLatLng(e.latlng).setContent(formatTooltip(poly)).openOn(map);
      });

      poly.on('mouseover', e => {
         e.target.setStyle({ fillOpacity: 0.4 })
         const popup = e.target.getPopup();
         popup.setLatLng(e.latlng).setContent(formatTooltip(poly)).openOn(map);
      });
      poly.on('mousemove', e => {
         const popup = e.target.getPopup();
         popup.setLatLng(e.latlng).openOn(map);
      })
      poly.on('mouseout', e => {
         e.target.setStyle({ fillOpacity: 0.2 })
         e.target.closePopup();
      });
      poly.addTo(polygonGroup);
   });

   if (polygonGroup.getLayers().length > 0 && from == 'filter') {
      map.flyToBounds(polygonGroup.getBounds(), {padding: [140, 140]});
   }
   closeLoading();
}

function addMarker(latitude, longitude) {
   markerLayer.clearLayers();
   L.marker([latitude, longitude]).addTo(markerLayer);
   map.flyTo([latitude, longitude], 15);
}

function formatTooltip({jurisdiction, address, status, _latlngs, name}) {
   const geojsonPolygon = turf.lineToPolygon(turf.lineString(_latlngs[0].map(x => [x.lng, x.lat])))
   const areaMilesSquared = turf.area(geojsonPolygon) / 2.59e+6;
   return `\
   <div>
      <h3>${name}</h3>
      <div class="tooltip-grid">
         <div class="key">
            <div>Jurisdiction</div>
            <div>Status</div>
            <div>Area</div>
            <div>Address</div>
         </div>
         <div>
            <div>${jurisdiction}</div>
            <div>${status}</div>
            <div>${areaMilesSquared.toFixed(2)} square miles</div>
            <div>${address}</div>
         </div>
      </div>
   <div>`
}

let filterOpen = false;
$('.filters').onclick = () => {
   filterOpen = !filterOpen;
   if (filterOpen) {
      openFilter();
   } else {
      closeFilter();
   }
}

document.body.onkeydown = (evt) => {
   const { key } = evt;
   if (key === 'Escape') {
   }
}

$('#select-all').onclick = () => {
   $$('.filter').forEach(f => f.checked = true);
   refresh();
}

$('#select-none').onclick = () => {
   $$('.filter').forEach(f => f.checked = false);
   refresh();
}

function closeSidebar() {
   sidebarOpen = false;

   $('#expand-button').style.display = 'block';
   $('.sidebar-content').style.display = 'none';
   $('#hide-button').style.display = 'none';
}
   

function openSidebar() {
   sidebarOpen = true;
   $('#expand-button').style.display = 'none';
   $('.sidebar-content').style.display = 'block';
   $('#hide-button').style.display = 'block';
}

function hideSidebarSizingControls() {
   $('#hide-button').style.display = 'none';
   $('#expand-button').style.display = 'none';
}

function showSidebarSizingControls() {
   $('#hide-button').style.display = 'block';
   $('#expand-button').style.display = 'block';
}

let sidebarOpen = true;
function sizeSidebar() {
   const { innerWidth } = window;
   if (innerWidth < 640) {
      
      closeSidebar();
   } else {
      openSidebar();
      hideSidebarSizingControls();
   }
}
sizeSidebar();
window.onresize = () => sizeSidebar();

$('#expand-button').onclick = () => openSidebar();
$('#hide-button').onclick = () => closeSidebar();

export { addMarker };