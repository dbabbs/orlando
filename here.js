import { credentials } from './config.js';

const autocompleteGeocodeUrl = (query, prox) => 
`https://autocomplete.geocoder.api.here.com/6.2/suggest.json
?app_id=${credentials.id}
&app_code=${credentials.code}
&query=${query}
&prox=${prox}`;

const geocodeUrl = (id) => 
`https://geocoder.api.here.com/6.2/geocode.json
?locationid=${id}
&app_id=${credentials.id}
&app_code=${credentials.code}`;

const isolineUrl = (center, range, rangeType, mode = 'car') => 
`https://isoline.route.api.here.com/routing/7.2/calculateisoline.json
?app_id=${credentials.id}
&app_code=${credentials.code}
&mode=shortest;${mode};
traffic:${'enabled'}
&start=geo!${center[0]},${center[1]}
&range=${range}
&rangetype=${rangeType}`;

export { autocompleteGeocodeUrl, geocodeUrl, isolineUrl}