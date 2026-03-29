// Offline Map App Logic with UI Manager & Downloader State

// 1. Connection Status
const connectionStatus = document.getElementById('connection-status');
const connectionText = connectionStatus.querySelector('.status-text');

function updateOnlineStatus() {
    if (navigator.onLine) {
        connectionStatus.classList.remove('offline');
        connectionStatus.classList.add('online');
        connectionText.textContent = 'Online';
    } else {
        connectionStatus.classList.remove('online');
        connectionStatus.classList.add('offline');
        connectionText.textContent = 'Offline';
    }
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// 2. Modals & Nav Interaction
const navItems = document.querySelectorAll('.nav-item[data-target]');
const modals = document.querySelectorAll('.glass-modal');
const closeBtns = document.querySelectorAll('.close-btn');

function closeModal(id) {
    const modal = document.getElementById(id);
    if(modal) modal.classList.add('hidden');
    navItems.forEach(n => n.classList.remove('active'));
}

function openModal(id, triggerNavItem) {
    modals.forEach(m => m.classList.add('hidden'));
    navItems.forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.remove('hidden');
    triggerNavItem.classList.add('active');
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-target');
        const targetModal = document.getElementById(targetId);
        if (targetModal.classList.contains('hidden')) {
            openModal(targetId, item);
        } else {
            closeModal(targetId);
        }
    });
});

closeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.glass-modal');
        if(modal) closeModal(modal.id);
    });
});

// Settings: Dark Mode
const darkModeToggle = document.getElementById('dark-mode-toggle');
darkModeToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
    }
});

// Toast system
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => { toast.classList.add('hidden'); }, 3000);
}

// 3. Leaflet and Offline Tile Architecture
const mapDb = localforage.createInstance({ name: "OfflineMapDB", storeName: "tiles" });

L.TileLayer.Offline = L.TileLayer.extend({
    createTile: function (coords, done) {
        const tile = document.createElement('img');
        const tileUrl = this.getTileUrl(coords);
        // Prefix key with layer identifier to separate street vs satellite
        const layerId = this.options.layerId || 'street';
        const key = `${layerId}_${coords.z}_${coords.x}_${coords.y}`;

        L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));
        L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile));

        if (this.options.crossOrigin || this.options.crossOrigin === '') {
            tile.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
        }

        tile.alt = '';
        tile.setAttribute('role', 'presentation');

        mapDb.getItem(key).then(blob => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                tile.src = url;
                // Add class for dark mode inverter targeting if street
                if(layerId === 'street') L.DomUtil.addClass(tile, 'street-layer');
            } else {
                if (navigator.onLine) {
                    fetch(tileUrl)
                        .then(response => {
                            if (!response.ok) throw new Error('Network fault');
                            return response.blob();
                        })
                        .then(newBlob => {
                            mapDb.setItem(key, newBlob);
                            const url = URL.createObjectURL(newBlob);
                            tile.src = url;
                            if(layerId === 'street') L.DomUtil.addClass(tile, 'street-layer');
                        })
                        .catch(err => { tile.src = tileUrl; });
                } else {
                    done(new Error("Tile not cached and offline"), tile);
                }
            }
        }).catch(err => {
            tile.src = tileUrl; 
        });

        return tile;
    }
});
L.tileLayer.offline = function (url, options) { return new L.TileLayer.Offline(url, options); };

// Map Initialization
const map = L.map('map', {
    zoomControl: false // Move zoom control later
}).setView([22.9, 79.2], 5);
L.control.zoom({ position: 'bottomright' }).addTo(map);

// Define Map Layers
const layers = {
    street: L.tileLayer.offline('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18, attribution: '© OpenStreetMap contributors', crossOrigin: true, layerId: 'street'
    }),
    satellite: L.tileLayer.offline('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18, attribution: '© Esri', crossOrigin: true, layerId: 'satellite'
    })
};

let activeLayerId = 'street';
layers[activeLayerId].addTo(map);

// Dismiss Splash Screen seamlessly when map engine boots
function dismissSplash() {
    const splash = document.getElementById('app-splash');
    if (splash && !splash.classList.contains('hidden')) {
        splash.classList.add('hidden');
        setTimeout(() => { if(splash.parentNode) splash.remove(); }, 600); // Wait for CSS transition
    }
}
// Listen to the first layer resolving, or fallback securely to a maximum timer
layers[activeLayerId].on('load', dismissSplash);
setTimeout(dismissSplash, 1500);

// Map View Toggles
const layerBtns = document.querySelectorAll('.layer-btn');
layerBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const nextLayer = e.target.getAttribute('data-layer');
        if (nextLayer !== activeLayerId) {
            map.removeLayer(layers[activeLayerId]);
            activeLayerId = nextLayer;
            layers[activeLayerId].addTo(map);
            
            layerBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        }
        closeModal('modal-layers');
    });
});

// GPS Location Feature
// GPS Location Feature
const navLocationBtn = document.getElementById('nav-location');
const shareLocationChip = document.getElementById('share-location-chip');
let gpsMarker = null;
let gpsCircle = null;
let watchId = null;

navLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        showToast("Geolocation is not supported by your browser");
        return;
    }

    if (watchId !== null) {
        // Stop tracking
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
        navLocationBtn.style.color = "";
        if (gpsMarker) map.removeLayer(gpsMarker);
        if (gpsCircle) map.removeLayer(gpsCircle);
        gpsMarker = null; gpsCircle = null;
        shareLocationChip.classList.add('hidden');
        window.lastKnownLocation = null;
        showToast("Location tracking stopped.");
        return;
    }

    showToast("Acquiring high-accuracy GPS signal...");
    navLocationBtn.style.color = "var(--primary)";
    let isFirstLock = true;
    
    // Switch to watchPosition for continuous tracking and better accuracy over time
    watchId = navigator.geolocation.watchPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        window.lastKnownLocation = { lat, lng };
        shareLocationChip.classList.remove('hidden');

        if (isFirstLock) {
            map.setView([lat, lng], 16);
            isFirstLock = false;
            showToast(`Location locked! (Accuracy: ${Math.round(accuracy)}m)`);
        }
        
        if (gpsMarker) map.removeLayer(gpsMarker);
        if (gpsCircle) map.removeLayer(gpsCircle);
        
        const pulseIcon = L.divIcon({
            className: 'gps-pulse-container',
            html: '<div class="gps-pulse" style="width:16px;height:16px;"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
        
        gpsMarker = L.marker([lat, lng], {icon: pulseIcon}).addTo(map);
        // Map accuracy to radius, using a minimum of 10m so it's visible
        gpsCircle = L.circle([lat, lng], { radius: Math.max(accuracy, 10), color: '#3b82f6', fillOpacity: 0.15, weight: 1 }).addTo(map);
        
    }, (err) => {
        let errMsg = "Failed to retrieve location.";
        if (err.code === 1) errMsg = "Location permission denied.";
        if (err.code === 2) errMsg = "Position unavailable (check GPS signal).";
        if (err.code === 3) errMsg = "Location request timed out.";
        
        showToast(errMsg);
        navLocationBtn.style.color = "";
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        watchId = null;
        shareLocationChip.classList.add('hidden');
    }, { 
        enableHighAccuracy: true,
        maximumAge: 0, 
        timeout: 15000 
    });
});


// Downloader with Pause/Resume/Cancel capabilities
const downloadBtn = document.getElementById('download-btn');
const clearCacheBtn = document.getElementById('clear-cache-btn');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressPercentage = document.getElementById('progress-percentage');
const tilesCountText = document.getElementById('tiles-count');
const pauseResumeBtn = document.getElementById('pause-resume-btn');
const cancelBtn = document.getElementById('cancel-btn');

let dlState = { active: false, paused: false, cancelled: false, tilesData: [], index: 0 };

function long2tile(lon, zoom) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
function lat2tile(lat, zoom) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

downloadBtn.addEventListener('click', async () => {
    if (!navigator.onLine) { showToast("You must be online to download maps!"); return; }
    if (dlState.active) return;
    
    const bounds = map.getBounds();
    const minZoom = map.getZoom();
    const activeLayerObj = layers[activeLayerId];
    const maxZ = activeLayerObj.options.maxZoom;
    const maxZoomTarget = Math.min(minZoom + 3, maxZ); 
    
    let tilesToDownload = [];
    for (let z = minZoom; z <= maxZoomTarget; z++) {
        const top_tile = lat2tile(bounds.getNorth(), z);
        const left_tile = long2tile(bounds.getWest(), z);
        const bottom_tile = lat2tile(bounds.getSouth(), z);
        const right_tile = long2tile(bounds.getEast(), z);
        for (let y = top_tile; y <= bottom_tile; y++) {
            for (let x = left_tile; x <= right_tile; x++) {
                tilesToDownload.push({ x, y, z });
            }
        }
    }

    if (tilesToDownload.length > 2500) { showToast(`Area too large (${tilesToDownload.length} tiles). Zoom in.`); return; }
    if (tilesToDownload.length === 0) return;

    // Reset State
    dlState = { active: true, paused: false, cancelled: false, tilesData: tilesToDownload, index: 0 };
    downloadBtn.classList.add('disabled');
    
    progressContainer.classList.remove('hidden');
    pauseResumeBtn.textContent = "Pause";
    updateProgressUI();
    
    processDownloadQueue();
});

pauseResumeBtn.addEventListener('click', () => {
    if (!dlState.active) return;
    dlState.paused = !dlState.paused;
    pauseResumeBtn.textContent = dlState.paused ? "Resume" : "Pause";
    if(!dlState.paused) processDownloadQueue();
});

cancelBtn.addEventListener('click', () => {
    if (!dlState.active) return;
    dlState.cancelled = true;
    dlState.active = false;
    finishDownloadUI("Download cancelled.");
});

async function processDownloadQueue() {
    if (!dlState.active || dlState.paused || dlState.cancelled) return;

    if (dlState.index >= dlState.tilesData.length) {
        finishDownloadUI("Map Area Downloaded Successfully!");
        return;
    }

    const t = dlState.tilesData[dlState.index];
    const key = `${activeLayerId}_${t.z}_${t.x}_${t.y}`;
    const uriRaw = layers[activeLayerId].options.url;
    
    // Evaluate URL
    let url = uriRaw.replace('{z}', t.z).replace('{x}', t.x).replace('{y}', t.y);
    if(url.includes('{s}')) {
        const s = ['a', 'b', 'c'][Math.floor(Math.random() * 3)];
        url = url.replace('{s}', s);
    }

    const existing = await mapDb.getItem(key);
    if (!existing) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const blob = await response.blob();
                await mapDb.setItem(key, blob);
            }
        } catch (err) {}
    }

    dlState.index++;
    updateProgressUI();

    // Yield control so UI doesn't freeze
    setTimeout(processDownloadQueue, 10);
}

function updateProgressUI() {
    const total = dlState.tilesData.length;
    const current = dlState.index;
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    progressFill.style.width = `${percent}%`;
    progressPercentage.textContent = `${percent}%`;
    tilesCountText.textContent = `${current} / ${total} tiles`;
}

function finishDownloadUI(msg) {
    dlState.active = false;
    downloadBtn.classList.remove('disabled');
    setTimeout(() => { progressContainer.classList.add('hidden'); }, 1000);
    showToast(msg);
}

clearCacheBtn.addEventListener('click', async () => {
    if (confirm("Delete all offline maps cache?")) {
        await mapDb.clear();
        showToast("Offline cache cleared.");
    }
});

// Service Worker Registration for Offline App Shell
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// ====== Share Location Feature ======
const shareBtn = document.getElementById('share-location-chip');
shareBtn.addEventListener('click', async () => {
    if(!window.lastKnownLocation) return;
    
    const {lat, lng} = window.lastKnownLocation;
    const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
    const shareData = {
        title: 'Offline Map Viewer',
        text: 'Here is my exact location right now:',
        url: url
    };
    
    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch(err) {
            console.log("Error sharing:", err);
        }
    } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`).then(() => {
            showToast("Location link copied to clipboard!");
        });
    }
});

// ====== Search Feature & History ======
const searchInput = document.getElementById('search-input');
const doSearchBtn = document.getElementById('search-btn');
const searchHistory = document.getElementById('search-history');
const searchDb = localforage.createInstance({ name: "OfflineMapDB", storeName: "searches" });

async function loadSearchHistory() {
    searchHistory.innerHTML = '';
    const history = (await searchDb.getItem('history')) || [];
    if(history.length === 0) {
        searchHistory.innerHTML = '<li style="color:var(--text-muted); padding: 8px; font-size:0.85rem;">No saved locations yet.</li>';
        return;
    }
    history.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.textContent = item.label;
        li.addEventListener('click', () => {
            map.setView([item.lat, item.lon], 14);
            closeModal('modal-search');
            showToast(`Jumped to ${item.label}`);
        });
        searchHistory.appendChild(li);
    });
}
// Load immediately to populate DOM
loadSearchHistory();

const searchResultsList = document.getElementById('search-results-list');

doSearchBtn.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if(!query) return;
    
    if(!navigator.onLine) {
        showToast("Online search requires internet connection.");
        return;
    }
    
    doSearchBtn.textContent = "🔍";
    doSearchBtn.disabled = true;
    searchResultsList.innerHTML = '<li style="padding:10px; color:var(--text-muted); text-align:center; list-style:none; font-size:0.85rem;">Searching...</li>';
    searchResultsList.classList.remove('hidden');
    
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        searchResultsList.innerHTML = '';
        
        if (data && data.length > 0) {
            data.forEach(place => {
                const lat = parseFloat(place.lat);
                const lon = parseFloat(place.lon);
                
                // Format label properly (first and last parts for brevity)
                const parts = place.display_name.split(',');
                const label = parts[0].trim() + (parts.length > 1 ? ", " + parts[parts.length-1].trim() : "");
                const fullDesc = place.display_name;
                
                const li = document.createElement('li');
                li.className = 'history-item';
                li.style.borderBottom = "1px solid var(--border-glass)";
                li.innerHTML = `<strong>${label}</strong><br><span style="font-size:0.75rem; color:var(--text-muted); white-space:normal; display:block; margin-top:2px;">${fullDesc}</span>`;
                
                li.addEventListener('click', async () => {
                    map.setView([lat, lon], 14);
                    showToast(`Found: ${label}`);
                    
                    // Save to offline history DB
                    let history = (await searchDb.getItem('history')) || [];
                    history = history.filter(h => h.label !== label); // Remove dupes
                    history.unshift({ lat, lon, label });
                    if(history.length > 5) history.pop(); // Keep only last 5
                    await searchDb.setItem('history', history);
                    
                    loadSearchHistory();
                    closeModal('modal-search');
                    searchInput.value = '';
                    searchResultsList.classList.add('hidden');
                    searchResultsList.innerHTML = '';
                });
                
                searchResultsList.appendChild(li);
            });
        } else {
            searchResultsList.innerHTML = '<li style="padding:10px; color:var(--danger); text-align:center; list-style:none; font-size:0.85rem;">No places found.</li>';
        }
    } catch(err) {
        searchResultsList.innerHTML = '<li style="padding:10px; color:var(--danger); text-align:center; list-style:none; font-size:0.85rem;">Search failed (Server Error).</li>';
    } finally {
        doSearchBtn.textContent = "Go";
        doSearchBtn.disabled = false;
    }
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        doSearchBtn.click();
    }
});
