
'use strict';

const functions = require('firebase-functions');
const maps = require('@google/maps');

const { 
    dialogflow, 
    Permission,
} = require('actions-on-google');

const client = maps.createClient({key: 'AIzaSyDcB7WbcbSsMUjPtW3ug3IiL8DVxlX7hNM'});
    
const requestPermission = (conv) => {
  conv.data.requestedPermission = conv.surface.capabilities.has('actions.capability.SCREEN_OUTPUT')
            ? 'DEVICE_PRECISE_LOCATION'
            : 'DEVICE_COARSE_LOCATION';

    return conv.ask(new Permission({
      context: 'To locate you',
      permissions: conv.data.requestedPermission,
    }));

};

const userInfo = (conv, params, granted) => {
    if (!granted) {
         conv.close(`Okie Docky`);
    }
    else {

        const {requestedPermission} = conv.data;
        if (requestedPermission === 'DEVICE_COARSE_LOCATION') {
            // If we requested coarse location, it means that we're on a speaker device.
            const city = conv.device.location.city;
            return conv.close(`You are at ${city}`);
        }
        else if (requestedPermission === 'DEVICE_PRECISE_LOCATION') {
            // If we requested precise location, it means that we're on a phone.
            // Because we will get only latitude and longitude, we need to
            // reverse geocode to get the city.
            const {coordinates} = conv.device.location;
            // conv.close(`You are at ${coordinates.latitude}, ${coordinates.longitude}`);
            var address = coodinateToAddress(coordinates.latitude, coordinates.longitude)
            return address.then((result) => {
                conv.close(`You are at ${result}`);
            }, (error) => {
                conv.close(`Sorry there has been an error ${error}`);
                console.log(error)
            });
        } else {
            // Note: Currently, precise locaton only returns lat/lng coordinates on phones and lat/lng coordinates 
            // and a geocoded address on voice-activated speakers. 
            // Coarse location only works on voice-activated speakers.
            conv.close('Sorry, I could not figure out where you are.');
        }
    }
};

const coodinateToAddress = (latitude, longitude) => {
  const latlng = [latitude,longitude];
  return new Promise((resolve, reject) => client.reverseGeocode({latlng},
    (e, response) => {
      if (e) {
        return reject(e);
      } else {
        const {results} = response.json;
        const {formatted_address} = results[0];
        resolve(formatted_address)
      }
      reject(new Error('Could not parse city name from Google Maps results'));
    })
  );
};

const app = dialogflow();

app.intent('request_permission', requestPermission);
app.intent('user_info', userInfo);

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);