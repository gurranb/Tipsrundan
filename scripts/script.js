import { questions } from "./questions.js";

let startLatitude = 58.753139;
let startLongitude = 17.007761;
let startZoomLevel = 17;
let totalPoints = 0;
let currentLocationMarker;
const geofenceRadius = 8;
let answeredQuestion = false; // Initialize answeredQuestion flag

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

  currentLocationMarker.on("dragend", function (e) {
    const newLatLng = e.target.getLatLng();
    startLatitude = newLatLng.lat;
    startLongitude = newLatLng.lng;
    checkGeofences(newLatLng);
  });
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

window.onload = function() {
  const userLocation = getUserLocation();
  console.log("userlocation" + userLocation.lat + "---" + userLocation.lng)
  
  if (userLocation) {
    // Calculate distance and bearing to the first location (Fråga 1 / location 1)
    const firstLocation = questions[0];
    console.log("firstLocation" + firstLocation.latitude + "---" + firstLocation.longitude)
    const { distance, bearing } = calculateDistanceAndBearing(firstLocation.latitude, firstLocation.longitude, userLocation.lat, userLocation.lng);
    // Display distance and direction to the first location (Fråga 1 / location 1)
    displayDistanceAndDirection(distance, bearing);
    // Call checkGeofences with the user's location
    checkGeofences(userLocation);
  }
}

let currentQuestionIndex = 0;

function displayQuestion(questionObj, nextLocation, currentIndex) {
  const container = document.getElementById("question-container");
  
  console.log("Displaying question...");
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
  console.log(newLatLng)
  const nextLocation = questions[currentQuestionIndex];
  if (nextLocation) {
    const { distance, bearing } = calculateDistanceAndBearing(nextLocation.latitude, nextLocation.longitude, newLatLng.lat, newLatLng.lng);

    // Update the currentQuestionIndex if the distance to the next location is within the geofence radius
    if (distance <= geofenceRadius) {
      currentQuestionIndex++; // Move to the next question index
    }

    // Update the distance and direction regardless of whether the question for location 1 has been answered
    displayDistanceAndDirection(distance, bearing);
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

  updateTotalPoints(totalPoints);
  answeredQuestion = true;
  document.getElementById("question-container").innerHTML = "";
  if (nextLocation && typeof nextLocation.latitude !== 'undefined' && typeof nextLocation.longitude !== 'undefined') {
    // Calculate distance and direction to the next location
    const userLocation = getUserLocation();
    if (userLocation) {
      const { distance, bearing } = calculateDistanceAndBearing(nextLocation.latitude, nextLocation.longitude, userLocation.lat, userLocation.lng);
      // Show distance and direction to the next location
      displayDistanceAndDirection(distance, bearing);
    } else {
      alert("Kunde inte hämta användarens plats.");
    }

    // Move to the next location
    //goToNextQuestion(currentIndex);
  } else {
    alert("Hittar inte nästa fråga");
  }

  showGifContainer();

    checkGeofences(userLocation);

}


function displayDistanceAndDirection(distance, bearing) {
  const distanceElement = document.getElementById("distance");
  const directionElement = document.getElementById("direction");
console.log(bearing)
  if (distanceElement && directionElement) {
    distanceElement.textContent = "Avstånd: " + distance.toFixed(2) + " meter";
    directionElement.textContent = "Nästa: " + getDirectionFromBearing(bearing);
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
  const bearing = Math.atan2(y, x) * (180 / Math.PI);
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  return { distance, bearing };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c * 1000; // Convert distance to meters
  return distance;
}

function getDirectionFromBearing(bearing) {
  const directions = ["Norrut", "Nordöst", "Österut", "Sydöst", "Söderut", "Sydväst", "Västerut", "Nordväst"];
  const index = 2 //Math.round(bearing / 45) % 8;

  return directions[index];
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
if (userLocation) {
  checkGeofences(userLocation);
}

let displayNextQuestion = false;
function checkGeofences(userLocation) {
  
  let insideGeofence = false;

  for (let index = 0; index < questions.length; index++) {
    const location = questions[index];
    const distance = calculateDistance(userLocation.lat, userLocation.lng, location.latitude, location.longitude);

    console.log(`Distance to location ${index + 1}:...${location.name}: ${distance} meters`);
    if (distance <= geofenceRadius) {
      insideGeofence = true;
      console.log("Inside geofence. Displaying question...");
      displayQuestion(location, questions[index + 1], index);
      displayNextQuestion = true;
      break;
    }
  }
  if (!insideGeofence) {
    console.log("You are not inside any geofence.");
  }
}

function goToNextQuestion(currentIndex) {
  let nextIndex = currentIndex + 1; // Increment currentIndex by 1 to move to the next question

  // Check if the next question index is within the bounds of the questions array
  if (nextIndex < questions.length) {
    const nextQuestion = questions[nextIndex];
    const nextLatLng = L.latLng(nextQuestion.latitude, nextQuestion.longitude);
    map.setView(nextLatLng);
    checkGeofences(nextLatLng, nextIndex);
  } else {
    const currentQuestion = questions[currentIndex];
    if (currentQuestion.name === "Fråga 10") {
      alert("Du har nått din slutdestination.");
    } else {
      return;
    }
  }
}

// Function to handle location found event
function onLocationFound(e) {
  const radius = e.accuracy;

  L.marker(e.latlng)
    .addTo(map)
    .bindPopup("Du är " + radius + " meter från målet")
    .openPopup();

  L.circle(e.latlng, radius).addTo(map);

  // Check geofences only if the user hasn't already answered a question for the current location
  if (!answeredQuestion) {
    checkGeofences(e.latlng);
  }
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