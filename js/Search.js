import { autocompleteGeocodeUrl, geocodeUrl } from './here.js';
import { addMarker } from './app.js';
class Search {
   constructor() {
      this.container = document.querySelector('#search-container');
      this.field = document.querySelector('#address');
      this.items = document.querySelector('.autocomplete-items')
      this.field.oninput = evt => this.onSearch(evt);
      this.field.onkeydown = evt => this.onKeyDown(evt);
      this.prov = `28.538336,-81.379234`;

      this.index = 0;
      this.matches = [];
   }

   async onSearch(evt) {
      this.index = 0;
      this.clearList();
      const value = evt.target.value;

      if (value.length === 0) {
         return;
      }
      let { suggestions } = (await fetch( autocompleteGeocodeUrl(value, this.prox) )
         .then(res => res.json()));
      this.matches = suggestions.filter(x => x.address.state === 'FL')

      this.matches.forEach((s, i) => {
         const item = document.createElement('div');
         item.classList.add('item');
         const label = (s.address.houseNumber ? s.address.houseNumber : '') + ' ' + 
            (s.address.street ? (s.address.street + ', ') : '')  + 
            (s.address.city ? s.address.city: '') + ' ' + 
            (s.address.state ? s.address.state: '') + ', ' + 
            s.address.country;
         item.innerText = label;
         item.id = s.locationId;
         item.onmouseover = () => this.highlightItem(i);
         item.onclick = () => this.select(i);
         this.items.appendChild(item);
      });
      this.highlightItem(this.index);
   }

   onKeyDown(evt) {
      const { key } = evt;
      let i = this.index;
      if (key === 'ArrowDown') {
         i++;
      } else if (key === 'ArrowUp') {
         i--;
      } else if (key === 'Enter' || key === 'Tab') {

         this.select(this.index);
      }
      if (i > this.matches.length - 1) {
         i = 0;
      } else if (i < 0) {
         i = this.matches.length -1;
      }
      this.index = i;
      this.highlightItem(this.index);

   }

   highlightItem(index) {
      this.index = index;
      const items = document.querySelectorAll('.item');
      items.forEach((item, i) => {
         if (item.classList.contains('active')) {
            item.classList.remove('active');
         }
         if (i === index) {
            item.classList.add('active');
         }
      })
   }

   async select(index) {

      const items = document.querySelectorAll('.item');
      if (items.length === 0) {
         return;
      }
      this.field.value = items[index].innerText;
      

      const id = document.querySelectorAll('.item')[index].id;
      this.clearList();

     
      const response = await fetch( geocodeUrl(id) ).then(res => res.json());
      
      const { Latitude, Longitude } = response.Response.View[0].Result[0].Location.DisplayPosition;
   
      addMarker(Latitude, Longitude)
   }

   clearList() {
      while (this.items.firstChild) {
         this.items.removeChild(this.items.firstChild);
      }
   }
}

export default Search;