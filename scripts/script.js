import { questions } from "./questions.js";

let startLatitude = 58.753139;
let startLongitude = 17.007761;
let startZoomLevel = 17;
let totalPoints = 0;
let currentLocationMarker;
const geofenceRadius = 8;
let userMarker;

const map = L.map("map").setView([startLatitude, startLongitude], startZoomLevel);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

function setStartLocation() {
  if (currentLocationMarker) {
    map.removeLayer(currentLocationMarker);
  }

  currentLocationMarker = L.marker([startLatitude, startLongitude], {
    draggable: true
  }).addTo(map);
}

setStartLocation();

function addMarkersAndCircles(locations) {
  locations.forEach((location) => {
    L.circle([location.latitude, location.longitude], {
      radius: geofenceRadius,
      color: "red",
      fillOpacity: 0.1
    }).addTo(map);

    L.marker([location.latitude, location.longitude])
      .addTo(map)
      .bindPopup(location.name);
  });
}

addMarkersAndCircles(questions);

// när sidan laddas
window.onload = function() {
  // kommentera in ifall GPS ska användas*
  navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError);

  // kommentera in vid TEST*

  // const userLocation = getUserLocation();
  
  // if (userLocation) {
  //   const firstLocation = questions[0];
  //   console.log("firstLocation" + firstLocation.latitude + "---" + firstLocation.longitude)
  //   const { distance, bearing } = calculateDistanceAndBearing(firstLocation.latitude, firstLocation.longitude, userLocation.lat, userLocation.lng);
  //   displayDistanceAndDirection(distance, bearing);
  //   checkGeofences(userLocation);
  // }
}

// GPS kommentera ut ifall det ska testas*

function handleLocationSuccess(position) {
  const userLatitude = position.coords.latitude;
  const userLongitude = position.coords.longitude;
  const userLocation = { lat: userLatitude, lng: userLongitude };

  const firstLocation = questions[0];
  const { distance, bearing } = calculateDistanceAndBearing(firstLocation.latitude, firstLocation.longitude, userLocation.lat, userLocation.lng);
  displayDistanceAndDirection(distance, bearing);
  checkGeofences(userLocation);
  map.locate({setView: true, maxZoom: 17});
  // Add a marker representing the user's current location
  userMarker = L.marker([userLatitude, userLongitude]).addTo(map);
}

function handleLocationError(error) {
  console.error("Error getting user location:", error);
}


let currentQuestionIndex = 0;

function displayQuestion(questionObj, nextLocation, currentIndex) {
  const container = document.getElementById("question-container");
  
  console.log("Visar frågan.");
  hideGifContainer();
  const { question, image, answers, correctAnswer } = questionObj; 
  container.innerHTML = "";
  const questionElement = document.createElement("h2");
  questionElement.textContent = question;
  container.appendChild(questionElement);
  const imageElement = document.createElement("img");
  imageElement.src = image;
  imageElement.width = 300;
  imageElement.height = 200;
  container.appendChild(imageElement);
  answers.forEach((answer) => {
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "answers";
    radio.value = answer;
    container.appendChild(radio);
    const label = document.createElement("label");
    label.textContent = answer;
    container.appendChild(label);
    container.appendChild(document.createElement("br"));
  });
  const submitButton = document.createElement("button");
  submitButton.textContent = "Svara";
  submitButton.addEventListener("click", () => {
    const selectedAnswer = document.querySelector('input[name="answers"]:checked').value;
    checkAnswer(selectedAnswer, correctAnswer, nextLocation, currentIndex);
  });
  container.appendChild(submitButton);
}

function onMarkerDragEnd(e) {
  const newLatLng = e.target.getLatLng();
  startLatitude = newLatLng.lat;
  startLongitude = newLatLng.lng;
  const nextLocation = questions[currentQuestionIndex];
  if (nextLocation) {
    const { distance, bearing } = calculateDistanceAndBearing(nextLocation.latitude, nextLocation.longitude, newLatLng.lat, newLatLng.lng);

     displayDistanceAndDirection(distance, bearing);
     checkGeofences(newLatLng);
  }
}

currentLocationMarker.on("dragend", onMarkerDragEnd);

function checkAnswer(selectedAnswer, correctAnswer, nextLocation, currentIndex) {
  selectedAnswer = selectedAnswer.trim();

  if (selectedAnswer === correctAnswer) {
    totalPoints += questions[currentIndex].points;
    alert("Rätt svar! Du har fått " + questions[currentIndex].points + " poäng.");
  } else {
    alert("Fel svar! 0 poäng.");
  }

  currentQuestionIndex++;
  
  updateTotalPoints(totalPoints);

  document.getElementById("question-container").innerHTML = "";
  if (nextLocation && typeof nextLocation.latitude !== 'undefined' && typeof nextLocation.longitude !== 'undefined') {
    const userLocation = getUserLocation();
    if (userLocation) {
      const { distance, bearing } = calculateDistanceAndBearing(nextLocation.latitude, nextLocation.longitude, userLocation.lat, userLocation.lng);
      displayDistanceAndDirection(distance, bearing);
      
    } else {
      alert("Kunde inte hämta användarens plats.");
    }
  } else {
    alert("Tipsrundan är slut");
  }

  showGifContainer();

    checkGeofences(userLocation);
}

function displayDistanceAndDirection(distance, bearing) {
  const nameElement = document.getElementById("name");
  const distanceElement = document.getElementById("distance");
  const directionElement = document.getElementById("direction");
  
  if (distanceElement && directionElement) {
    let questionNum = currentQuestionIndex +1
    nameElement.textContent = "Fråga: " + questionNum;
    distanceElement.textContent = "Avstånd: " + distance.toFixed(2) + " meter";
    directionElement.textContent = "Riktning: " + getDirectionFromBearing(bearing);
  }
}

function updateTotalPoints(points) {
  const totalPointsElement = document.getElementById("total-points");
  if (totalPointsElement) {
    totalPointsElement.textContent = "Poäng: " + points;
  }
}

function calculateDistanceAndBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const y = Math.sin(dLon) * Math.cos(lat2 * (Math.PI / 180));
  const x = Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) - Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos(dLon);
  let bearing = Math.atan2(y, x) * (180 / Math.PI);
  
  if (bearing < 0) {
    bearing += 360;
  }
  
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  return { distance, bearing };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c * 1000;
  return distance;
}

function getDirectionFromBearing(bearing) {
  const directions = ["Norrut", "Nordöst", "Österut", "Sydöst", "Söderut", "Sydväst", "Västerut", "Nordväst"];
  const index = Math.round(bearing / 45) % 8;
  const reverseIndex = (index + 4) % 8;
  return directions[reverseIndex];
}

function getUserLocation() {
  if (currentLocationMarker) {
    const latitude = currentLocationMarker.getLatLng().lat;
    const longitude = currentLocationMarker.getLatLng().lng;
    return { lat: latitude, lng: longitude };
  } else {
    return null;
  }
}

const userLocation = getUserLocation();

let displayNextQuestion = false;

function checkGeofences(userLocation) {
  
  let insideGeofence = false;

  for (let index = 0; index < questions.length; index++) {
    const location = questions[index];
    const distance = calculateDistance(userLocation.lat, userLocation.lng, location.latitude, location.longitude);


    if (distance <= geofenceRadius) {
      insideGeofence = true;
      console.log("Innanför ett geofence. Visar fråga...");
      displayQuestion(location, questions[index + 1], index);
      displayNextQuestion = true;

      const distanceElement = document.getElementById("distance");
      const directionElement = document.getElementById("direction");
      distanceElement.textContent = "";
      directionElement.textContent = "";

      break;
    }
  }
  if (!insideGeofence) {
    console.log("Du är inte innanför något geofence.");
  }
}

function onLocationFound(e) {
  const radius = e.accuracy;

  L.marker(e.latlng)
    .addTo(map)
    .bindPopup("Du är " + radius + " meter från målet")
    .openPopup();

  L.circle(e.latlng, radius).addTo(map);
}

map.on("locationfound", onLocationFound);

function hideGifContainer() {
  const gifContainer = document.getElementById("gif-container");
  gifContainer.style.display = "none";
}

function showGifContainer() {
  const gifContainer = document.getElementById("gif-container");
  gifContainer.style.display = "block";
}