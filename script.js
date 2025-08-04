// ---- Weather Whiskers Script (Updated with Weather Alerts + Sun & Moon Info) ----

const API_KEY = "59f7b7c9009fd2ba26f4008a8cdafe45";
const UV_API_KEY = "openuv-yu8uusrmdwlwyyn-io";
const AQI_TOKEN = "f4e0ee1cf12450b33966cdd69ddd4eca4c59eddf";

let voiceReady = false;
let isMuted = false;

document.addEventListener("click", () => {
  voiceReady = true;
});

document.getElementById("mute-toggle").addEventListener("click", () => {
  isMuted = !isMuted;
  document.getElementById("mute-toggle").textContent = isMuted ? "🔇" : "🔊";
});

window.onload = () => {
  getLocation();
};

// --- Geolocation ---
function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      getWeather(latitude, longitude);
      getUVIndex(latitude, longitude);
      getAQI(latitude, longitude);
      getAlerts(latitude, longitude);
      getSunMoon(latitude, longitude);
    });
  } else {
    alert("Geolocation not supported");
  }
}

// --- Fetch Weather ---
async function getWeather(lat, lon) {
  try {
    const currentURL = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const forecastURL = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

    const [currentRes, forecastRes] = await Promise.all([
      fetch(currentURL),
      fetch(forecastURL)
    ]);

    const currentData = await currentRes.json();
    const forecastData = await forecastRes.json();

    updateUI(currentData);
    updateForecast(forecastData.list);
  } catch (err) {
    console.error("Weather fetch error:", err);
  }
}

// --- Fetch UV Index ---
async function getUVIndex(lat, lon) {
  try {
    const res = await fetch(`https://api.openuv.io/api/v1/uv?lat=${lat}&lng=${lon}`, {
      headers: { "x-access-token": UV_API_KEY }
    });
    const data = await res.json();
    document.getElementById("uv-index").textContent = data.result.uv.toFixed(1);
  } catch (err) {
    console.error("UV Index fetch error:", err);
  }
}

// --- Fetch AQI ---
async function getAQI(lat, lon) {
  try {
    const res = await fetch(`https://api.waqi.info/feed/geo:${lat};${lon}/?token=${AQI_TOKEN}`);
    const data = await res.json();
    document.getElementById("aqi").textContent = data.status === "ok" ? data.data.aqi : "--";
  } catch (err) {
    console.error("AQI fetch error:", err);
  }
}

// --- Fetch Weather Alerts ---
async function getAlerts(lat, lon) {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
    const data = await res.json();
    const alertBox = document.getElementById("weather-alerts");
    const alertMsg = document.getElementById("alert-message");

    if (data.alerts && data.alerts.length > 0) {
      const alert = data.alerts[0];
      alertMsg.textContent = `${alert.event} — ${alert.description}`;
      alertBox.classList.remove("hidden");
    } else {
      alertBox.classList.add("hidden");
    }
  } catch (err) {
    console.error("Alert fetch error:", err);
  }
}

// --- Fetch Moon & Sun Info ---
// --- Fetch Sunrise & Sunset using sunrise-sunset.org ---
// --- Fetch Sunrise & Sunset Info (Free API) ---
async function getSunMoon(lat, lon) {
  try {
    const res = await fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`);
    const data = await res.json();

    const sunriseUTC = new Date(data.results.sunrise);
    const sunsetUTC = new Date(data.results.sunset);

    const sunrise = sunriseUTC.toLocaleTimeString("en-IN", {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    const sunset = sunsetUTC.toLocaleTimeString("en-IN", {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    document.getElementById("sunrise").textContent = sunrise;
    document.getElementById("sunset").textContent = sunset;
  } catch (err) {
    console.error("Sun info fetch error:", err);
  }
}




// --- Update Main UI ---
function updateUI(data) {
  const loc = document.getElementById("location");
  const date = document.getElementById("date");
  const desc = document.getElementById("weather-desc");
  const temp = document.getElementById("temperature");
  const feels = document.getElementById("feels-like");
  const icon = document.getElementById("weather-icon");

  const catGif = document.getElementById("cat-gif");
  const catMsg = document.getElementById("cat-message");
  const background = document.getElementById("weather-background");

  const voice = new Audio();
  voice.autoplay = true;

  const condition = data.weather[0].main.toLowerCase();
  const iconCode = data.weather[0].icon;
  const hour = new Date().getHours();

  loc.textContent = data.name;
  date.textContent = new Date().toDateString();
  desc.textContent = data.weather[0].description;
  temp.textContent = Math.round(data.main.temp) + "°C";
  feels.textContent = Math.round(data.main.feels_like) + "°C";
  icon.src = getIcon(iconCode);

  const bg = getBackground(condition, hour);
  const cat = getCatGif(condition, hour);
  const msg = getCatMessage(bg);
  const audio = getVoice(bg);

  background.innerHTML = `<img src="${bg}" class="w-full h-full object-cover">`;
  catGif.src = cat;
  catMsg.textContent = msg;

  voice.src = audio;
  setTimeout(() => {
    if (voiceReady && !isMuted) {
      voice.play().catch(err => {
        console.warn("Voice playback failed:", err);
      });
    }
  }, 1000);
}

// --- Forecast UI ---
function updateForecast(list) {
  const container = document.getElementById("forecast");
  container.innerHTML = "";

  const dayGroups = {};
  list.forEach(entry => {
    const date = new Date(entry.dt * 1000);
    const day = date.toDateString();
    if (!dayGroups[day]) dayGroups[day] = [];
    dayGroups[day].push(entry);
  });

  const days = Object.keys(dayGroups).slice(0, 5);

  days.forEach(dayStr => {
    const entries = dayGroups[dayStr];
    const avgTemp = Math.round(entries.reduce((sum, item) => sum + item.main.temp, 0) / entries.length);
    const iconCode = entries[0].weather[0].icon;
    const mainWeather = entries[0].weather[0].main;
    const emoji = getEmoji(mainWeather);
    const icon = getIcon(iconCode);
    const dayName = new Date(entries[0].dt * 1000).toLocaleDateString("en-US", { weekday: "short" });

    container.innerHTML += `
      <div class="flex flex-col items-center bg-white/10 p-2 rounded-lg">
        <div class="font-semibold">${dayName}</div>
        <img src="${icon}" alt="icon" class="w-8 h-8" />
        <div>${avgTemp}°C</div>
        <div>${emoji}</div>
      </div>
    `;
  });
}

// --- Helpers ---
function getIcon(code) {
  return `assets/icons/icon_${
    code.includes("13") ? "snow" :
    code.includes("09") || code.includes("10") ? "rain" :
    code.includes("11") ? "thunder_rain" :
    code.includes("01") ? "sun" :
    code.includes("02") ? "sun_small_cloud" :
    code.includes("03") || code.includes("04") ? "cloud" : "sun"
  }.png`;
}

function getEmoji(main) {
  const map = {
    Thunderstorm: "⛈️", Drizzle: "🌦️", Rain: "🌧️", Snow: "❄️", Clear: "☀️",
    Clouds: "☁️", Mist: "🌫️", Smoke: "💨", Haze: "🌫️", Dust: "🌪️",
    Fog: "🌁", Sand: "🏜️", Ash: "🌋", Squall: "🌬️", Tornado: "🌪️"
  };
  return map[main] || "❔";
}

function getBackground(condition, hour) {
  const night = hour < 6 || hour > 19;
  if (condition.includes("thunder")) return "assets/backgrounds/bg_thunderstorm.gif";
  if (condition.includes("rain")) return night ? "assets/backgrounds/bg_rainy_night.gif" : "assets/backgrounds/bg_rainy_day.gif";
  if (condition.includes("snow")) return "assets/backgrounds/bg_snowy.gif";
  if (condition.includes("clear")) return night ? "assets/backgrounds/bg_clear_night.gif" : "assets/backgrounds/bg_sunny_day.gif";
  if (condition.includes("cloud")) return "assets/backgrounds/bg_cloudy.gif";
  return "assets/backgrounds/bg_glitch.gif";
}

function getCatGif(condition, hour) {
  const night = hour < 6 || hour > 19;
  if (condition.includes("thunder")) return "assets/cats/cat_thunderstorm.gif";
  if (condition.includes("rain")) return night ? "assets/cats/cat_rainy_night.gif" : "assets/cats/cat_rainy_day.gif";
  if (condition.includes("snow")) return "assets/cats/cat_snowy.gif";
  if (condition.includes("clear")) return night ? "assets/cats/cat_clear_night.gif" : "assets/cats/cat_sunny_day.gif";
  if (condition.includes("cloud")) return "assets/cats/cat_cloudy.gif";
  return "assets/cats/cat_glitch.gif";
}

function getCatMessage(bg) {
  const map = {
    bg_clear_night: "🌙 Meow~ what a purr-fect night for stargazing! Stay cozy, hooman!",
    bg_cloudy: "☁️ It’s cloudy out there… no sunbeams to nap in today. Don’t forget your jacket!",
    bg_glitch: "⚠️ Hiss! The weather matrix glitched... Try refreshing, hooman.",
    bg_hot: "🔥 Paw-sitively blazing! Stay cool, drink lots of water, and avoid long naps in the sun!",
    bg_party: "🎉 Woohoo! It’s party weather! Let’s shake our tails and vibe to the sunshine!",
    bg_rainy_day: "🌧️ Meow... it’s raining. Take an umbrella so your fur doesn’t get soggy!",
    bg_rainy_night: "🌧️🌙 Drip drip at night... Snuggle in, hooman. No adventures till morning!",
    bg_snowy: "❄️ Snowflakes! Time to chase ‘em! Bundle up — it's chilly for tiny paws!",
    bg_sunny_day: "🌞 Purr-fect sunny day! Don’t forget sunscreen — I’ve got fur, you don’t!",
    bg_sunny_evening: "🌇 Golden hour vibes, hooman. Great time for a walk (or a nap)!",
    bg_thunderstorm: "🌩️ Eek! Thunder! I’m hiding under the couch... You should stay safe inside too!"
  };
  const name = bg.split("/").pop().replace(".gif", "");
  return map[name] || "😺 Weather unknown, but I’m still cute!";
}

function getVoice(bg) {
  const name = bg.split("/").pop().replace(".gif", "");
  return `assets/voices/voice_${name}.mp3`;
}

function searchCity() {
  const city = encodeURIComponent(document.getElementById("city-input").value.trim());
  if (city === "") return;

  const currentURL = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
  const forecastURL = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`;

  Promise.all([fetch(currentURL), fetch(forecastURL)])
    .then(async ([currentRes, forecastRes]) => {
      if (!currentRes.ok || !forecastRes.ok) {
        alert("City not found!");
        return;
      }
      const currentData = await currentRes.json();
      const forecastData = await forecastRes.json();

      updateUI(currentData);
      updateForecast(forecastData.list);
      getUVIndex(currentData.coord.lat, currentData.coord.lon);
      getAQI(currentData.coord.lat, currentData.coord.lon);
      getAlerts(currentData.coord.lat, currentData.coord.lon);
      getSunMoon(currentData.coord.lat, currentData.coord.lon);
    })
    .catch(err => {
      console.error("City search error:", err);
      alert("Something went wrong.");
    });
}

window.searchCity = searchCity;
