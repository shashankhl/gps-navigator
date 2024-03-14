var map;
var startMarker = null;
var endMarker = null;
var routingControl = null;
var graph = {};

function initMap() {
  map = L.map("map");

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        var latlng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        map.setView(latlng, 12);
      },
      function () {
        alert("Could not get your position");
        map.setView([0, 0], 1);
      }
    );
  } else {
    map.setView([0, 0], 1);
  }
  // end

  map.on("click", function (event) {
    handleMapClick(event.latlng);
  });
}

function resetMap() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        var latlng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        map.setView(latlng, 12);
      },
      function () {
        alert("Could not get your position");
        map.setView([0, 0], 1);
      }
    );
  } else {
    map.setView([0, 0], 1);
  }
  closeRoutePopup();
  map.removeLayer(startMarker);
  map.removeLayer(endMarker);
  if (routingControl) map.removeControl(routingControl);
  startMarker = null;
  endMarker = null;
  routingControl = null;
  graph = {};
}

function handleMapClick(latlng) {
  if (!startMarker) {
    getAddress(latlng, function (address) {
      startMarker = L.marker(latlng)
        .addTo(map)
        .bindPopup(
          L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `start-popup`,
          })
        )
        .setPopupContent(address)
        .openPopup();
      console.log("Start Location:", latlng.lat, latlng.lng);
      map.flyTo(latlng, 14);
    });
  } else if (!endMarker) {
    getAddress(latlng, function (address) {
      endMarker = L.marker(latlng)
        .addTo(map)
        .bindPopup(
          L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `end-popup`,
          })
        )
        .setPopupContent(address)
        .openPopup();
      console.log("End Location:", latlng.lat, latlng.lng);

      // findShortestPath();
    });
  }
}
//Dijkstra's algorithm starts here
// function findShortestPath() {
//   var start = startMarker.getLatLng();
//   var end = endMarker.getLatLng();
//   console.log("Finding shortest path between:", start, end);

//   if (routingControl) {
//     map.removeLayer(routingControl);
//   }

//   routingControl = L.Routing.control({
//     waypoints: [L.latLng(start.lat, start.lng), L.latLng(end.lat, end.lng)],
//     routeWhileDragging: true,
//   }).addTo(map);

//   routingControl.on("routesfound", function (e) {
//     var routes = e.routes;
//     if (routes && routes.length > 0) {
//       var route = routes[0];
//       var coordinates = route.coordinates;
//       graph["path"] = coordinates;
//       console.log("Path:", coordinates);

//       // Simulate traffic details
//       var trafficDetails = "Traffic is moderate. Estimated time: 15 minutes.";
//       graph["traffic"] = trafficDetails;
//     }
//   });
// }

function updateRoutePopupContent(popupContent) {
  document.getElementById("routePopupContent").innerHTML = popupContent;
}

function openRoutePopup() {
  document.getElementById("routeContainer").style.display = "block";
}

function closeRoutePopup() {
  document.getElementById("routeContainer").style.display = "none";
}

function findShortestPath() {
  var start = startMarker.getLatLng();
  var end = endMarker.getLatLng();
  console.log("Finding shortest path between:", start, end);

  if (routingControl) {
    routingControl.removeFrom(map);
  }

  routingControl = L.Routing.control({
    waypoints: [L.latLng(start.lat, start.lng), L.latLng(end.lat, end.lng)],
    routeWhileDragging: true,
    show: false,
  });

  routingControl.on("routesfound", function (e) {
    var routes = e.routes;
    if (routes && routes.length > 0) {
      var route = routes[0];
      var coordinates = route.coordinates;
      graph["path"] = coordinates;
      console.log("Path:", coordinates);

      var trafficDetails = "Traffic is moderate. Estimated time: 15 minutes.";
      graph["traffic"] = trafficDetails;

      var popupContent = `
          <div class="route-popup">
              <h2>Route Information</h2>
              <p>Distance: ${(route.summary.totalDistance / 1000).toFixed(
                1
              )} km</p>
              <p>Duration: ${Math.floor(route.summary.totalTime / 60)} min</p>
              <ol>
        `;
      route.instructions.forEach((instruction) => {
        popupContent += `<li>${
          instruction.text
        } (${instruction.distance.toFixed(1)} m)</li>`;
      });
      popupContent += `
              </ol>
          </div>
        `;

      updateRoutePopupContent(popupContent);
      openRoutePopup();
    }
  });

  routingControl.addTo(map);
}

function createGraphVisualization() {
  if (graph && graph.path) {
    var pathCoordinates = graph.path;

    sessionStorage.setItem(
      "graphData",
      JSON.stringify({
        path: pathCoordinates,
        traffic: graph.traffic || "No traffic information available.",
      })
    );

    var popupWindow = window.open("graph.html", "_blank");
  }
}

function getAddress(latlng, callback) {
  var xhr = new XMLHttpRequest();
  var url =
    "https://nominatim.openstreetmap.org/reverse?format=json&lat=" +
    latlng.lat +
    "&lon=" +
    latlng.lng +
    "&zoom=18&addressdetails=1";

  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200) {
        var response = JSON.parse(xhr.responseText);
        var address = response.address;
        var formattedAddress = "";
        if (address.road) {
          formattedAddress += address.road + ", ";
        }
        if (address.suburb) {
          formattedAddress += address.suburb + ", ";
        }
        if (address.city) {
          formattedAddress += address.city;
        }
        callback(formattedAddress);
      } else {
        console.error("Error fetching address:", xhr.status);
        callback(null);
      }
    }
  };

  xhr.open("GET", url);
  xhr.setRequestHeader("Accept-Language", "en");
  xhr.send();
}

initMap();
