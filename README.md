# 🌍 wveri-go maps (Offline Map Viewer)

<div align="center">
  <img src="icons/icon.svg" width="120" height="120" alt="Offline Map Viewer Icon" />
  
  <br /> <br />

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Made with HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://wikipedia.org/wiki/HTML5)
  [![Powered by Leaflet](https://img.shields.io/badge/Leaflet-199900?style=flat&logo=leaflet&logoColor=white)](https://leafletjs.com/)
  [![PWA Ready](https://img.shields.io/badge/PWA-Ready-blue?style=flat&logo=pwa&logoColor=white)](#)

  <p align="center">
    <strong>A lightning-fast, highly modern, and fully offline-capable web app for map viewing and navigation.</strong>
  </p>

  <p align="center">
    <a href="https://pixeloffc.github.io/wveri-go-maps/" target="_blank">
      <img src="https://img.shields.io/badge/Try_Live_Demo-000000?style=for-the-badge&logo=github&logoColor=white" alt="Live Demo" />
    </a>
  </p>

  <br />
  
  <img src="assets/map_demo.webp" alt="Map Demo Preview" width="600" />
</div>

---

## ✨ Key Features

This application boasts state-of-the-art functionality built natively for the web browser:

- 📶 **100% Offline Capability:** Download massive areas of the globe (OpenStreetMap or Satellite Imagery) utilizing IndexedDB and custom Service Workers.
- 🎨 **Glassmorphic UI:** A visually stunning, lightweight interface featuring dynamic glassmorphism side-panels and docks native to modern mobile app standards.
- 📍 **High-Accuracy Geolocation:** Live GPS tracking with real-time accuracy radii right on the map.
- 🔗 **Native Sharing:** Send your pinpoint location to anyone using standard Web Share APIs.
- 🔍 **Nominatim Search & History:** Search for places via OSM's Nominatim, complete with fully retained offline history jumps.
- 🌙 **Adaptive Themes:** Built-in intelligent light and dark modes that adjust instantly to user preference.

<br />

## 🚀 Quick Start / Deployment

Since this is a vanilla HTML/CSS/JS application, no heavy build processes, bundlers, or tricky dependencies are needed. 

### Local Development
1. Clone this repository:
   ```bash
   git clone https://github.com/pixeloffc/wveri-go-maps.git
   ```
2. Open the directory using **Live Server** (VS Code) or any simple local HTTP server:
   ```bash
   npx serve .
   ```
3. That's it! Visit `http://localhost:3000` (or your server's port) in your browser.

### Hosting (GitHub Pages / Vercel)
To host this live instantly:
- Go to your repository settings -> **Pages** -> Deploy from `main` branch. 
- Due to its 100% static architecture and the native PWA `manifest.json`, the app will cleanly install on mobile devices straight from the URL.

<br />

## 🗺️ How to Use (Usage Guide)

Using wveri-go maps is designed to be frictionless, whether you are connected to the grid or completely off it.

1. **Find Your Location**: Use the bottom **Search** dock to look up any city, landmark, or set of coordinates.
2. **Download for Offline**: Once you have positioned the viewport over an area you want to save, click the **Download** dock. The app will fetch the map tiles for that exact area and cache them natively to your device's persistent storage.
3. **Go Offline**: Disconnect your internet connection. The map infrastructure will intercept all network requests and flawlessly serve your saved areas from internal storage.
4. **Track Live GPS**: Hit the **Location** button to begin high-accuracy tracking. Use the **Share** feature to instantly send your exact coordinates and a pinpoint link to a friend.
5. **Dark Mode & Layers**: Switch between standard Street Maps and Satellite Imagery via the **Layers** dock, and toggle Dark Mode inside **Settings** to save battery life.

### 💻 Mini-Code Example: Offline Map Initialization
If you're curious about how our offline engine works under the hood, here is a mini-example of the internal Leaflet map extension:

```javascript
// 1. Initialize standard Map Instance
const map = L.map('map').setView([22.9, 79.2], 5);

// 2. Define our custom Offline TileLayer wrapper 
// (Intercepts map panning to check local IndexedDB first before making network requests)
const layers = {
    street: L.tileLayer.offline('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18, 
        crossOrigin: true,
        layerId: 'street' // Differentiates cache keys by map style
    })
};

// 3. Mount layer to screen
layers.street.addTo(map);
```

<br />

## 🛠️ Tech Stack & Architecture

This project deliberately avoids massive frontend frameworks to maximize offline efficiency.
* **Core:** Semantic `HTML5`, native `Vanilla JS`, and modern `CSS3` variables.
* **Maps Engine:** `Leaflet.js` (with a highly customized tile-loader overriding standard network fetch methods).
* **Databases:** `localForage` (wraps IndexedDB) to effortlessly save vast sets of map image blobs permanently on the device.

<br />

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! 
Feel free to check out the [issues page](../../issues).

## 📝 License
This project is [MIT](LICENSE) licensed.
