import { colors, labels, pinColor } from './config.js';

const $ = q => document.querySelector(q);

const $$ = q => document.querySelectorAll(q);

const openLoading = () => { 
   $('#loading-container').style.opacity = 1; 
}

const closeLoading = () => {
   $('#loading-container').style.opacity = 0;
}

const setMax = rangeType => {
   $('#range').max = rangeType === 'time' ? 600 : 6000;
}

const closeFilter = () => {
   $('.filters img').style.transform ='rotate(-180deg)';
   $('.filter-items').style.height = '0px';
}

let maxHeight = '200px';
let initial = true;
const openFilter = () => {
   const filterItems = $('.filter-items');
   if (initial) {
      initial = false;
      const { y } = filterItems.getBoundingClientRect();
      maxHeight = `calc(100vh - ${y}px - var(--larger-spacing) * 2)`;
   }
   $('.filters img').style.transform = 'none';
   filterItems.style.height = maxHeight;
}

const updateFilterText = active => {
   const text = active.join(', ');
   if (active.length === 0) {
      $('.filter-text').innerText = 'No jurisdictions selected';
   } else if (text.length <= 32) {
      $('.filter-text').innerText = text;
   } else {
      $('.filter-text').innerText = active.length + ' jurisdiction' + (active.length > 1 ? 's' : '') + ' selected';
   }
}

const initializeSidebar = () =>{
   $('.sidebar-key').innerHTML = Object.keys(colors).map(key => 
      `<div class="key-item"><div class="square" style="border: 1px solid ${colors[key](1)}; background: ${colors[key](0.3)};"></div>${labels[key]}</div>`
   ).join('');
   $('.sidebar-key').innerHTML += 
   `<div class="key-item"><div class="circle" style="background: ${pinColor}"></div>Station location</div>`   
}

const setRangeText = () => {
   const rangeType = $('#time').checked ? 'time' : 'distance';
   const value = $('#range').value;
   if (rangeType === 'distance') {
      const miles = (Number(value) * 0.00062137).toFixed(1);
      $('#range-text').innerText = miles + ' miles';
   } else {
      const minutes = Number.isInteger(Number(value / 60)) ? Number(value / 60) : (Number(value) / 60).toFixed(1);
      $('#range-text').innerText = minutes + ' mins';
   }
}

export { 
   $, 
   $$, 
   openLoading, 
   closeLoading, 
   setMax,
   openFilter,
   closeFilter,
   updateFilterText,
   initializeSidebar,
   setRangeText
}