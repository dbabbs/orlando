const here = {
   id: 'Wf3z49YJK9ieJhsun9Wx',
   code: '8T7Stg2Jq1qvkfBn3Za4qw',
   apikey: 'EybNF4MkvcUj8WX1VJRKhT9dwDVz1wIHaKGF5tpqNss'
}

const autocompleteGeocodeUrl = (query, prox) => 
`https://autocomplete.geocoder.api.here.com/6.2/suggest.json
?app_id=${here.id}
&app_code=${here.code}
&query=${query}
&prox=${prox}`;

const geocodeUrl = (id) => 
`https://geocoder.api.here.com/6.2/geocode.json
?locationid=${id}
&app_id=${here.id}
&app_code=${here.code}`

export { autocompleteGeocodeUrl, geocodeUrl, here }