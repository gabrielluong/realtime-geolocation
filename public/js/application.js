$(function() {
	var userId = Math.random().toString(16).substring(2,15);
	var socket = io.connect('/');
	var map;

	var info = $('#infobox');
	var doc = $(document);

	// custom marker's icon styles
	var tinyIcon = L.Icon.extend({
		options: {
			shadowUrl: '../img/marker-shadow.png',
			iconSize: [25, 39],
			iconAnchor:   [12, 36],
			shadowSize: [41, 41],
			shadowAnchor: [12, 38],
			popupAnchor: [0, -30]
		}
	});
	var redIcon = new tinyIcon({ iconUrl: '../img/marker-red.png' });
	var yellowIcon = new tinyIcon({ iconUrl: '../img/marker-yellow.png' });

	var sentData = {};

	var connects = {};
	var markers = {};
	var watchProcess = null;

	socket.on('load:coords', function(data) {
		if (!(data.id in connects)) {
			setMarker(data);
		}

		connects[data.id] = data;
        connects[data.id].updated = $.now(); // shothand for (new Date).getTime()
	});

	// check whether browser supports geolocation api
	// if (navigator.geolocation) {
	// 	navigator.geolocation.getCurrentPosition(handle_geolocation_query, handle_errors, { enableHighAccuracy: true });
	// } else {
	// 	$('.map').text('Your browser is out of fashion, there\'s no geolocation!');
	// }

	$("#btnInit").click(initiate_watchlocation);
	$("#btnStop").click(stop_watchlocation);

	function initiate_watchlocation() {
		if (watchProcess == null) {
			watchProcess = navigator.geolocation.watchPosition(handle_geolocation_query, handle_errors, { enableHighAccuracy: true });
		}
    }

    function stop_watchlocation() {
    	if (watchProcess != null) {
    		navigator.geolocation.clearWatch(watchProcess);
    		watchProcess = null;
    		info.html("Stopped at " + new Date());
    	}
    }

	function handle_geolocation_query(position) {
		var lat       = position.coords.latitude;
		var lng       = position.coords.longitude;
		var acr       = position.coords.accuracy;
		var alt       = position.coords.altitude;
		var altAcr    = position.coords.altitudeAccuracy;
		var heading   = position.coords.heading;
		var speed     = position.coords.speed;
		var timestamp = new Date();
		var time      = new Date(position.timestamp);

		sentData = {
			id: userId,
			timestamp: timestamp,
			time: time,
			coords: [{
				lat: lat,
				lng: lng,
				acr: acr,
				alt: alt,
				altAcr: altAcr,
				heading: heading,
				speed: speed
			}]
		};

		socket.emit('send:coords', sentData);

		var text = "Latitude: " + lat + "<br/>" +
				   "Longitude: " + lng + "<br/>" +
				   "Accuracy: " + acr + "<br/>" +
				   "Altitude: " + alt + "<br/>" +
				   "Heading: " + heading + "<br/>" +
				   "Speed: " + speed + "<br/>" +
				   "Time: " + time;
		info.addClass('error').html(text);

		// mark user's position
		var userMarker = L.marker([lat, lng], {
			icon: redIcon
		});
		// uncomment for static debug
		// userMarker = L.marker([51.45, 30.050], { icon: redIcon });

		// load leaflet map
		map = L.map('map');

		// leaflet API key tiler
		L.tileLayer('http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/997/256/{z}/{x}/{y}.png', { maxZoom: 18, detectRetina: true }).addTo(map);

		// set map bounds
		map.fitWorld();
		userMarker.addTo(map);
		userMarker.bindPopup('<p>' + timestamp + '</p>').openPopup();
	}

	// showing markers for connections
	function setMarker(data) {
		for (i = 0; i < data.coords.length; i++) {
			var marker = L.marker([data.coords[i].lat, data.coords[i].lng], { icon: yellowIcon }).addTo(map);
			marker.bindPopup('<p>One more external user is here!</p>');
			markers[data.id] = marker;
		}
	}

	// handle geolocation api errors
	function handle_errors(error) {
		var errors = {
			1: 'Authorization fails', // permission denied
			2: 'Can\'t detect your location', //position unavailable
			3: 'Connection timeout' // timeout
		};
		showError('Error:' + errors[error.code]);
	}

	function showError(msg) {
		info.addClass('error').text(msg);

		doc.click(function() { info.removeClass('error') });
	}

	// delete inactive users every 15 sec
	// setInterval(function() {
	// 	for (ident in connects){
	// 		if ($.now() - connects[ident].updated > 15000) {
	// 			// delete connects[ident];
	// 			map.removeLayer(markers[ident]);

	// 		}
 //        }
 //    }, 15000);
});
