const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const API_KEY = require('./config/googlemaps');
const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client')));

app.get('/fetchLocalRealEstateAgencies/:a1/:a2', (req, res) => {
  const { a1, a2 } = req.params;

  let address1coord = {
    lat: null,
    lng: null
  };
  let address2coord = {
    lat: null,
    lng: null
  };

  let rea = []; // real estate agencies

  getLatLng(a1)
  .then((resp1) => {
    address1coord.lat = resp1.data.results[0].geometry.location.lat;
    address1coord.lng = resp1.data.results[0].geometry.location.lng;
    return getLatLng(a2);
  })
  .then((resp2) => {
    address2coord.lat = resp2.data.results[0].geometry.location.lat;
    address2coord.lng = resp2.data.results[0].geometry.location.lng;
    return getREA(address1coord, milesToMeters(10));
  })
  .then((rea1) => {
    rea1.data.results.forEach((place) => rea.push({ name: place.name, lat: place.geometry.location.lat, lng: place.geometry.location.lng }));
    return getREA(address2coord, milesToMeters(10));
  })
  .then((rea2) => {
    rea2.data.results.forEach((place) => rea.push({ name: place.name, lat: place.geometry.location.lat, lng: place.geometry.location.lng }));
    return getDistances(address1coord, rea);
  })
  .then((distances1) => {
    for (let i = 0; i < distances1.data.rows[0].elements.length; i++) {
      rea[i].distance1 = { text: distances1.data.rows[0].elements[i].distance.text, value: distances1.data.rows[0].elements[i].distance.value };
    }
    return getDistances(address2coord, rea);
  })
  .then((distances2) => {
    for (let i = 0; i < distances2.data.rows[0].elements.length; i++) {
      rea[i].distance2 = { text: distances2.data.rows[0].elements[i].distance.text, value: distances2.data.rows[0].elements[i].distance.value };
    }
  })
  .then(() => {
    rea.sort((a,b) => {
      let distanceA = a.distance1.value + a.distance2.value;
      let distanceB = b.distance1.value + b.distance2.value;
      return distanceA - distanceB;
    });
    res.json(rea);
  })
  .catch((err) => console.error(err));
});

function getLatLng(address) {
  if (address) {
    return axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${API_KEY}`)
  }
}

function getREA(coord, radius) { // get real estate agencies
  if (coord) {
    return axios.get(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coord.lat},${coord.lng}&radius=${radius}&type=real_estate_agency&key=${API_KEY}`);
  }
}

function milesToMeters(miles) {
  return miles*1609.344;
}

function getDistances(origin, destinations) {
  if (origin && destinations) {
    destinationsStr = '';
    destinations.forEach((destination) => destinationsStr += `${destination.lat},${destination.lng}|`);
    destinationsStr = destinationsStr.slice(0, destinationsStr.length-1);
    return axios.get(`https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${origin.lat},${origin.lng}&destinations=${destinationsStr}&key=${API_KEY}`);
  }
}

var port = process.env.PORT || 4040;
app.listen(port);
console.log("Listening on port " + port);
