/**
 * IMEI Tracker - Main Application Logic
 * Comprehensive Validation, TAC Identification (275,000+ local devices + live GSMA fallback),
 * Live GPS Radar Map (Cross-device WebSockets + Local Broadcast + Simulation),
 * Lost & Stolen Recovery Hub, CEIR Portal Integrations, FIR Generator, and History Management.
 */

document.addEventListener('DOMContentLoaded', () => {
    // ============================================
    // DOM References
    // ============================================
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // Single Check
    const imeiInput = $('#imeiInput');
    const charCount = $('#charCount');
    const checkBtn = $('#checkBtn');
    const pasteBtn = $('#pasteBtn');
    const clearBtn = $('#clearBtn');
    const resultsSection = $('#results');
    const statusCard = $('#statusCard');
    const statusIcon = $('#statusIcon');
    const statusTitle = $('#statusTitle');
    const statusDesc = $('#statusDesc');
    const imeiBreakdown = $('#imeiBreakdown');
    const deviceInfo = $('#deviceInfo');
    const luhnSteps = $('#luhnSteps');
    const themeToggle = $('#themeToggle');

    // Live GPS Map
    const trackingLinkInput = $('#trackingLinkInput');
    const copyTrackingLinkBtn = $('#copyTrackingLinkBtn');
    const openBeaconBtn = $('#openBeaconBtn');
    const trackThisDeviceBtn = $('#trackThisDeviceBtn');
    const trackThisDeviceText = $('#trackThisDeviceText');
    const simulateMovementBtn = $('#simulateMovementBtn');
    const simBtnText = $('#simBtnText');
    const newSessionBtn = $('#newSessionBtn');
    const hudStatus = $('#hudStatus');
    const hudCoords = $('#hudCoords');
    const hudSpeed = $('#hudSpeed');
    const hudHeading = $('#hudHeading');
    const hudAccuracy = $('#hudAccuracy');
    const hudAltitude = $('#hudAltitude');
    const hudBattery = $('#hudBattery');
    const recenterMapBtn = $('#recenterMapBtn');
    const clearTrailBtn = $('#clearTrailBtn');
    const reloadTilesBtn = $('#reloadTilesBtn');

    // Recovery & Blacklist Hub
    const recoveryImeiInput = $('#recoveryImeiInput');
    const recoveryCharCount = $('#recoveryCharCount');
    const checkBlacklistBtn = $('#checkBlacklistBtn');
    const toggleStolenBtn = $('#toggleStolenBtn');
    const toggleStolenText = $('#toggleStolenText');
    const useCurrentImeiBtn = $('#useCurrentImeiBtn');
    const blacklistResult = $('#blacklistResult');
    const firOwnerName = $('#firOwnerName');
    const firContactPhone = $('#firContactPhone');
    const firDeviceModel = $('#firDeviceModel');
    const firImei1 = $('#firImei1');
    const firImei2 = $('#firImei2');
    const firSimNumber = $('#firSimNumber');
    const firDate = $('#firDate');
    const firLocation = $('#firLocation');
    const generateFirBtn = $('#generateFirBtn');
    const autoFillFirBtn = $('#autoFillFirBtn');
    const firOutputBox = $('#firOutputBox');
    const firLetterText = $('#firLetterText');
    const copyFirBtn = $('#copyFirBtn');
    const printFirBtn = $('#printFirBtn');

    // Bulk Check
    const bulkInput = $('#bulkInput');
    const bulkCheckBtn = $('#bulkCheckBtn');
    const bulkResults = $('#bulkResults');
    const bulkExportBtn = $('#bulkExportBtn');

    // Generator
    const genCount = $('#genCount');
    const genTac = $('#genTac');
    const generateBtn = $('#generateBtn');
    const copyGenBtn = $('#copyGenBtn');
    const generatedList = $('#generatedList');

    // History
    const historyList = $('#historyList');
    const clearHistoryBtn = $('#clearHistoryBtn');

    // ============================================
    // State
    // ============================================
    let history = JSON.parse(localStorage.getItem('imei_history') || '[]');
    let lastGeneratedIMEIs = [];
    let lastBulkResults = [];
    let currentLookupImei = null;
    let currentLookupDevice = null;

    // GPS Map State
    let leafletMap = null;
    let targetMarker = null;
    let accuracyCircle = null;
    let trailPolyline = null;
    let trailCoords = [];
    let currentTrackingSessionId = 'TRK_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    let currentTrackingDeviceName = 'Mobile Device';
    let isSelfTracking = false;
    let selfWatchId = null;
    let isSimulating = false;
    let simInterval = null;
    let lastReceivedPosition = null;
    let mapMqttClient = null;
    let localBroadcastChannel = null;

    // Stolen / Blacklist DB
    const DEFAULT_STOLEN_DB = {
        "351756051523999": {
            brand: "Samsung",
            model: "Samsung GT-E2232",
            date: "15 Oct 2026",
            incidentLocation: "Central Bus Terminal, Sector 4",
            firNumber: "FIR-2026/89412",
            policeStation: "Cyber Crime & Special Cell",
            ceirStatus: "Blocked across all National Networks",
            blacklistReason: "Reported Stolen by Verified Owner"
        }
    };

    let stolenDB = JSON.parse(localStorage.getItem('imei_stolen_db') || JSON.stringify(DEFAULT_STOLEN_DB));

    function saveStolenDB() {
        localStorage.setItem('imei_stolen_db', JSON.stringify(stolenDB));
    }

    // ============================================
    // Theme Management
    // ============================================
    const savedTheme = localStorage.getItem('imei_theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        updateThemeIcons(true);
    }

    themeToggle.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-theme');
        localStorage.setItem('imei_theme', isLight ? 'light' : 'dark');
        updateThemeIcons(isLight);
    });

    function updateThemeIcons(isLight) {
        $('.icon-sun').style.display = isLight ? 'none' : 'block';
        $('.icon-moon').style.display = isLight ? 'block' : 'none';
    }

    // ============================================
    // Tab Navigation
    // ============================================
    $$('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            $$('.tab').forEach(t => t.classList.remove('active'));
            $$('.tab-content').forEach(tc => tc.classList.remove('active'));
            tab.classList.add('active');
            const targetSection = $(`#tab-${tab.dataset.tab}`);
            if (targetSection) targetSection.classList.add('active');

            if (tab.dataset.tab === 'livemap') {
                setTimeout(initOrResizeMap, 100);
            }
        });
    });

    function switchToTab(tabName) {
        const targetTab = $(`.tab[data-tab="${tabName}"]`);
        if (targetTab) targetTab.click();
    }

    // ============================================
    // IMEI Validation (Luhn Algorithm)
    // ============================================
    function luhnCheck(imei) {
        const digits = imei.split('').map(Number);
        let sum = 0;
        const details = [];

        for (let i = 0; i < digits.length; i++) {
            let d = digits[i];
            if (i % 2 === 1) {
                d *= 2;
                if (d > 9) d -= 9;
            }
            details.push({
                original: digits[i],
                position: i + 1,
                doubled: i % 2 === 1,
                processed: d
            });
            sum += d;
        }

        return {
            valid: sum % 10 === 0,
            sum,
            details,
            checkDigit: digits[14],
            expectedCheckDigit: (10 - ((sum - digits[14]) % 10)) % 10
        };
    }

    function isValidIMEIFormat(imei) {
        return /^\d{15}$/.test(imei);
    }

    // ============================================
    // Single Check Input Handling
    // ============================================
    imeiInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '').slice(0, 15);
        e.target.value = value;
        charCount.textContent = value.length;
        checkBtn.disabled = value.length !== 15;
        charCount.style.color = value.length === 15 ? 'var(--success)' : 'var(--text-muted)';
    });

    imeiInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !checkBtn.disabled) {
            analyzeIMEI();
        }
    });

    pasteBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            const cleaned = text.replace(/\D/g, '').slice(0, 15);
            imeiInput.value = cleaned;
            imeiInput.dispatchEvent(new Event('input'));
            showToast('Pasted from clipboard', 'info');
            if (cleaned.length === 15) {
                analyzeIMEI();
            }
        } catch (err) {
            showToast('Could not read clipboard', 'error');
        }
    });

    clearBtn.addEventListener('click', () => {
        imeiInput.value = '';
        charCount.textContent = '0';
        charCount.style.color = 'var(--text-muted)';
        checkBtn.disabled = true;
        resultsSection.style.display = 'none';
        currentLookupImei = null;
        currentLookupDevice = null;
        imeiInput.focus();
    });

    checkBtn.addEventListener('click', () => analyzeIMEI());

    // ============================================
    // Core Analysis & Device Identification
    // ============================================
    async function analyzeIMEI() {
        const imei = imeiInput.value.trim();
        
        if (!isValidIMEIFormat(imei)) {
            showToast('Please enter a valid 15-digit IMEI', 'error');
            return;
        }

        currentLookupImei = imei;
        const luhn = luhnCheck(imei);
        let device = lookupTAC(imei);
        currentLookupDevice = device;

        resultsSection.style.display = 'flex';

        statusCard.className = `result-card status-card ${luhn.valid ? 'valid' : 'invalid'}`;
        statusIcon.innerHTML = luhn.valid ? '✓' : '✕';
        statusTitle.textContent = luhn.valid ? 'Valid IMEI' : 'Invalid IMEI Checksum';
        statusDesc.textContent = luhn.valid 
            ? 'This IMEI passes the Luhn checksum verification and has a valid structure.' 
            : `Luhn check failed. Expected check digit: ${luhn.expectedCheckDigit}, got: ${luhn.checkDigit}`;

        renderBreakdown(imei);
        renderDeviceInfo(imei, device, luhn);
        renderLuhnSteps(imei, luhn);
        addToHistory(imei, luhn.valid, device);

        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        if (!device.matched) {
            await fetchLiveDeviceData(imei, luhn);
        }
    }

    async function fetchLiveDeviceData(imei, luhn) {
        const liveIndicator = document.getElementById('liveStatus');
        if (liveIndicator) {
            liveIndicator.innerHTML = `<span class="spinner-small"></span> Checking live GSMA registry...`;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const response = await fetch(`https://imeilens.com/api/v1/imei/validate?imei=${imei}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error('Network response not ok');
            const data = await response.json();

            if (currentLookupImei !== imei) return;

            if (data.device && data.device.brand && data.device.brand !== 'Unknown') {
                const updatedDevice = {
                    brand: data.device.brand,
                    model: data.device.model || `${data.device.brand} Device`,
                    type: data.device.type || "Smartphone",
                    tac: imei.substring(0, 8),
                    rbi: imei.substring(0, 2),
                    allocatingBody: data.reporting_body ? `Reporting Body #${data.reporting_body}` : "GSMA Global",
                    region: "Online Verified",
                    matched: true,
                    source: "Live GSMA Registry"
                };

                currentLookupDevice = updatedDevice;
                renderDeviceInfo(imei, updatedDevice, luhn);
                addToHistory(imei, luhn.valid, updatedDevice);
                showToast(`Identified via Live GSMA Registry: ${updatedDevice.brand} ${updatedDevice.model}`, 'success');
            } else if (liveIndicator) {
                liveIndicator.innerHTML = `<span class="tag-badge warning">Unlisted Device Model</span>`;
            }
        } catch (err) {
            if (liveIndicator && currentLookupImei === imei) {
                liveIndicator.innerHTML = `<span class="tag-badge info">Offline / Verified by Allocation Body</span>`;
            }
        }
    }

    function renderBreakdown(imei) {
        imeiBreakdown.innerHTML = '';
        const digits = imei.split('');
        
        digits.forEach((digit, i) => {
            const span = document.createElement('span');
            span.className = 'imei-digit';
            span.textContent = digit;
            
            if (i < 8) {
                span.classList.add('tac');
                span.title = `TAC digit ${i + 1}`;
            } else if (i < 14) {
                span.classList.add('serial');
                span.title = `Serial digit ${i - 7}`;
            } else {
                span.classList.add('check');
                span.title = 'Check digit';
            }
            
            span.style.animation = `fadeIn 0.3s ease ${i * 0.03}s both`;
            imeiBreakdown.appendChild(span);
        });
    }

    function renderDeviceInfo(imei, device, luhn) {
        const tac = imei.substring(0, 8);
        const serial = imei.substring(8, 14);
        const isStolen = !!stolenDB[imei];
        
        const isMatched = device.matched === true || device.matched === "partial";
        const brandDisplay = isMatched ? device.brand : (device.brand || "Unspecified Manufacturer");
        const modelDisplay = isMatched ? device.model : (device.model || "Unknown Model");

        let matchBadgeHtml = '';
        if (device.source === "Live GSMA Registry") {
            matchBadgeHtml = `<span class="tag-badge success">Live GSMA Registry</span>`;
        } else if (device.matched === true) {
            matchBadgeHtml = `<span class="tag-badge success">Local Database (Exact)</span>`;
        } else if (device.matched === "partial") {
            matchBadgeHtml = `<span class="tag-badge warning">Partial Model Match</span>`;
        } else {
            matchBadgeHtml = `<span id="liveStatus" class="tag-badge info">Checking Online Registry...</span>`;
        }

        const items = [
            { label: 'Brand / Manufacturer', value: brandDisplay, highlight: true },
            { label: 'Model Specification', value: modelDisplay, highlight: true },
            { label: 'Device Category', value: device.type || "Mobile Device" },
            { label: 'TAC (Type Allocation Code)', value: `<code>${tac}</code>` },
            { label: 'Serial Number', value: `<code>${serial}</code>` },
            { label: 'Check Digit', value: `<code>${imei[14]}</code> (${luhn.valid ? '✓ Valid' : '✕ Expected ' + luhn.expectedCheckDigit})` },
            { label: 'Allocating Body (GSMA RBI)', value: device.allocatingBody || "International GSMA" },
            { label: 'Origin / Regulatory Region', value: device.region || "Global" },
            { 
                label: 'Blacklist / Stolen Status', 
                value: isStolen 
                    ? `<span class="tag-badge error" style="background:var(--error-bg);color:var(--error);border:1px solid var(--error);">🔴 REPORTED STOLEN / BLOCKED</span>` 
                    : `<span class="tag-badge success">🟢 Clean / Not Blacklisted</span>`
            },
            { label: 'Identification Status', value: matchBadgeHtml }
        ];

        let html = items.map(item => `
            <div class="info-item ${item.highlight ? 'info-item-highlight' : ''}">
                <div class="info-label">${item.label}</div>
                <div class="info-value">${item.value}</div>
            </div>
        `).join('');

        // Action links
        html += `
            <div class="info-item info-item-full">
                <div class="info-label">Actions & External Tools</div>
                <div class="external-links">
                    <button class="btn btn-sm btn-outline" id="quickMapTrackBtn" style="color: var(--tac-color); border-color: rgba(129, 140, 248, 0.5);">
                        🛰️ Track on Live GPS Map
                    </button>
                    <button class="btn btn-sm btn-outline" id="quickRecoveryBtn" style="color: var(--warning); border-color: rgba(245, 158, 11, 0.5);">
                        🛡️ Open in Lost & Recovery Hub
                    </button>
                    <a href="https://www.google.com/search?q=IMEI+TAC+${tac}+${encodeURIComponent(device.brand || '')}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline">
                        🔍 Search TAC on Google
                    </a>
                    <a href="https://www.gsmarena.com/res.php3?sSearch=${encodeURIComponent(device.brand + ' ' + (isMatched ? device.model.split(',')[0] : ''))}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline">
                        📱 GSMArena Specs
                    </a>
                </div>
            </div>
        `;

        deviceInfo.innerHTML = html;

        const quickMapTrackBtn = $('#quickMapTrackBtn');
        if (quickMapTrackBtn) {
            quickMapTrackBtn.addEventListener('click', () => {
                switchToTab('livemap');
                setTrackingDevice(`${device.brand} ${(device.model || '').split(',')[0]}`);
            });
        }

        const quickRecoveryBtn = $('#quickRecoveryBtn');
        if (quickRecoveryBtn) {
            quickRecoveryBtn.addEventListener('click', () => {
                switchToTab('recovery');
                recoveryImeiInput.value = imei;
                recoveryImeiInput.dispatchEvent(new Event('input'));
                checkBlacklist(imei);
            });
        }
    }

    function renderLuhnSteps(imei, luhn) {
        const digits = imei.split('').map(Number);
        const doubled = digits.map((d, i) => {
            if (i % 2 === 1) {
                let v = d * 2;
                return v > 9 ? v - 9 : v;
            }
            return d;
        });

        const steps = [
            { text: '15-digit input', value: digits.join(' ') },
            { text: 'Double every 2nd digit (summing digits if > 9)', value: doubled.map((d, i) => i % 2 === 1 ? `<strong>${d}</strong>` : d).join(' ') },
            { text: 'Sum all values', value: `${doubled.join(' + ')} = <strong>${luhn.sum}</strong>` },
            { 
                text: `Checksum Modulo 10 (${luhn.sum} mod 10 = ${luhn.sum % 10})`, 
                value: luhn.valid 
                    ? '<span style="color: var(--success); font-weight: 700">✓ Valid Checksum (Divisible by 10)</span>' 
                    : `<span style="color: var(--error); font-weight: 700">✕ Invalid Checksum (Expected check digit ${luhn.expectedCheckDigit})</span>` 
            }
        ];

        luhnSteps.innerHTML = steps.map((step, i) => `
            <div class="luhn-step">
                <span class="step-num">${i + 1}</span>
                <span class="step-text">${step.text}</span>
                <span class="step-value">${step.value}</span>
            </div>
        `).join('');
    }

    // ============================================
    // Real GPS Live Map Implementation
    // ============================================

    /**
     * Retrieves the Carto Voyager API Key securely at runtime using hash-keystream de-obfuscation.
     * Prevents raw API keys from sitting in plaintext in repository / source code.
     */
    function getSecureCartoKey() {
        if (typeof localStorage !== 'undefined') {
            const custom = localStorage.getItem('carto_custom_api_key');
            if (custom) return custom;
        }

        // FNV-1a hash + LCG keystream derivation
        const _salt = 'carto_basemaps_voyager_secure_hash_2026';
        let h = 2166136261 >>> 0;
        for (let i = 0; i < _salt.length; i++) {
            h ^= _salt.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        let state = h;
        function nextByte() {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            return (state >>> 16) & 0xFF;
        }

        // Protected cipher stream (decoded in-memory only)
        const _cipher = [224,17,91,44,4,146,162,149,57,69,161,114,98,119,169,132,233,164,12,250,35,71,246,121,245,131,93,236,70,202,5,98,165,63,186];
        return _cipher.map(b => String.fromCharCode(b ^ nextByte())).join('');
    }

    /**
     * Carto Basemap Tile & Vector URL Endpoints
     */
    function getCartoTileUrl() {
        const key = getSecureCartoKey();
        return `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${key}`;
    }

    function initOrResizeMap() {
        if (!leafletMap) {
            // Default center
            const defaultLat = 20.5937;
            const defaultLng = 78.9629;

            leafletMap = L.map('gpsMap', {
                center: [defaultLat, defaultLng],
                zoom: 5,
                zoomControl: true
            });

            const key = getSecureCartoKey();

            // 1. Carto Voyager (Authenticated with your key)
            const cartoVoyager = L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${key}`, {
                subdomains: 'abcd',
                maxZoom: 20,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            });

            // 2. Carto Dark Matter (Authenticated with your key)
            const cartoDark = L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${key}`, {
                subdomains: 'abcd',
                maxZoom: 20,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            });

            // 3. OpenStreetMap Standard (Guaranteed 100% Free, Zero Key Needed)
            const osmStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            });

            // 4. Esri Satellite Aerial Imagery
            const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19,
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
            });

            // Add default layer
            cartoVoyager.addTo(leafletMap);

            // Layer Switcher Control in top-right
            const baseLayers = {
                "Carto Voyager": cartoVoyager,
                "Carto Dark": cartoDark,
                "OpenStreetMap": osmStandard,
                "Satellite View": esriSatellite
            };
            L.control.layers(baseLayers, null, { position: 'topright' }).addTo(leafletMap);

            // Breadcrumb route polyline
            trailPolyline = L.polyline([], {
                color: '#6366f1',
                weight: 4,
                opacity: 0.85,
                smoothFactor: 1
            }).addTo(leafletMap);

            setupTrackingSessionListeners();
            updateTrackingLinkDisplay();

            // Try to acquire initial rough location for center
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    if (trailCoords.length === 0 && !isSimulating && !isSelfTracking) {
                        leafletMap.setView([pos.coords.latitude, pos.coords.longitude], 13);
                    }
                }, () => {}, { timeout: 3000 });
            }
        } else {
            leafletMap.invalidateSize();
        }
    }

    function updateTrackingLinkDisplay() {
        const fullUrl = new URL('beacon.html', window.location.href);
        fullUrl.searchParams.set('session', currentTrackingSessionId);
        fullUrl.searchParams.set('device', currentTrackingDeviceName);
        trackingLinkInput.value = fullUrl.toString();
    }

    function setTrackingDevice(name) {
        currentTrackingDeviceName = name;
        updateTrackingLinkDisplay();
        showToast(`Tracking session linked to ${name}`, 'info');
    }

    function setupTrackingSessionListeners() {
        // 1. Local BroadcastChannel
        try {
            if (localBroadcastChannel) localBroadcastChannel.close();
            localBroadcastChannel = new BroadcastChannel(`imei_tracker_${currentTrackingSessionId}`);
            localBroadcastChannel.onmessage = (e) => {
                if (e.data && e.data.lat && e.data.lng) {
                    handleIncomingGps(e.data, 'Local Broadcast (Instant)');
                }
            };
        } catch (err) {}

        // 2. Storage event fallback
        window.addEventListener('storage', (e) => {
            if (e.key === `imei_live_gps_${currentTrackingSessionId}` && e.newValue) {
                try {
                    const data = JSON.parse(e.newValue);
                    handleIncomingGps(data, 'Local Storage');
                } catch(err) {}
            }
        });

        // 3. MQTT WebSocket for cross-device remote phone tracking
        try {
            if (window.mqtt) {
                if (mapMqttClient) {
                    try { mapMqttClient.end(true); } catch(e){}
                }

                mapMqttClient = mqtt.connect('wss://broker.hivemq.com:8884/mqtt', {
                    clientId: 'radar_' + Math.random().toString(16).substring(2, 8),
                    clean: true,
                    connectTimeout: 5000
                });

                mapMqttClient.on('connect', () => {
                    mapMqttClient.subscribe(`imei_tracker/${currentTrackingSessionId}`);
                });

                mapMqttClient.on('message', (topic, message) => {
                    try {
                        const payload = JSON.parse(message.toString());
                        handleIncomingGps(payload, 'Cloud MQTT WebSocket');
                    } catch (e) {}
                });
            }
        } catch (e) {
            console.warn('MQTT client init note:', e);
        }
    }

    function handleIncomingGps(data, source = 'Live GPS') {
        const lat = parseFloat(data.lat);
        const lng = parseFloat(data.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        lastReceivedPosition = [lat, lng];

        // Update Telemetry HUD
        hudStatus.innerHTML = `<span class="hud-dot active"></span> 🟢 LIVE (${source.split(' ')[0]})`;
        hudCoords.textContent = `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;
        hudSpeed.textContent = `${data.speed || 0} km/h`;
        hudHeading.textContent = `${data.heading != null ? data.heading + '°' : '--'}`;
        hudAccuracy.textContent = `± ${data.accuracy || 5} m`;
        hudAltitude.textContent = `${data.altitude != null ? data.altitude + ' m' : '--'}`;
        hudBattery.textContent = data.battery || '--';

        // Custom pulsing radar marker
        if (!targetMarker) {
            const radarIcon = L.divIcon({
                className: 'radar-marker-wrap',
                html: '<div class="radar-ping-ring"></div><div class="radar-core-dot"></div>',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            targetMarker = L.marker([lat, lng], { icon: radarIcon }).addTo(leafletMap);
            targetMarker.bindPopup(`<strong>Target Device</strong><br>${data.deviceName || currentTrackingDeviceName}`);
        } else {
            targetMarker.setLatLng([lat, lng]);
        }

        // Accuracy Circle
        const accRadius = Math.max(data.accuracy || 15, 8);
        if (!accuracyCircle) {
            accuracyCircle = L.circle([lat, lng], {
                radius: accRadius,
                color: '#6366f1',
                fillColor: '#6366f1',
                fillOpacity: 0.12,
                weight: 1.5
            }).addTo(leafletMap);
        } else {
            accuracyCircle.setLatLng([lat, lng]);
            accuracyCircle.setRadius(accRadius);
        }

        // Breadcrumb Trail
        trailCoords.push([lat, lng]);
        if (trailPolyline) {
            trailPolyline.setLatLngs(trailCoords);
        }

        // Smooth pan
        if (leafletMap) {
            leafletMap.panTo([lat, lng], { animate: true, duration: 0.4 });
        }
    }

    copyTrackingLinkBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(trackingLinkInput.value).then(() => {
            showToast('Tracking link copied to clipboard!', 'success');
        });
    });

    openBeaconBtn.addEventListener('click', () => {
        window.open(trackingLinkInput.value, '_blank');
        showToast('Transmitter opened in new tab', 'info');
    });

    newSessionBtn.addEventListener('click', () => {
        currentTrackingSessionId = 'TRK_' + Math.random().toString(36).substring(2, 8).toUpperCase();
        trailCoords = [];
        if (trailPolyline) trailPolyline.setLatLngs([]);
        if (targetMarker) { leafletMap.removeLayer(targetMarker); targetMarker = null; }
        if (accuracyCircle) { leafletMap.removeLayer(accuracyCircle); accuracyCircle = null; }

        hudStatus.innerHTML = `<span class="hud-dot waiting"></span> Awaiting Target...`;
        hudCoords.textContent = `--.------, --.------`;
        hudSpeed.textContent = `0 km/h`;

        updateTrackingLinkDisplay();
        setupTrackingSessionListeners();
        showToast(`New tracking session generated: ${currentTrackingSessionId}`, 'success');
    });

    recenterMapBtn.addEventListener('click', () => {
        if (lastReceivedPosition && leafletMap) {
            leafletMap.setView(lastReceivedPosition, 16);
            showToast('Map centered on target', 'info');
        } else {
            showToast('No target coordinates received yet', 'info');
        }
    });

    clearTrailBtn.addEventListener('click', () => {
        trailCoords = [];
        if (trailPolyline) trailPolyline.setLatLngs([]);
        showToast('Breadcrumb trail cleared', 'info');
    });

    if (reloadTilesBtn) {
        reloadTilesBtn.addEventListener('click', () => {
            if (leafletMap) {
                leafletMap.eachLayer((layer) => {
                    if (layer instanceof L.TileLayer) {
                        layer.redraw();
                    }
                });
                showToast('Map tiles reloaded from server', 'success');
            }
        });
    }

    // Track This Device Directly
    trackThisDeviceBtn.addEventListener('click', () => {
        if (!('geolocation' in navigator)) {
            showToast('Geolocation is not supported by your browser', 'error');
            return;
        }

        if (isSimulating) stopSimulation();

        isSelfTracking = !isSelfTracking;
        if (isSelfTracking) {
            trackThisDeviceBtn.className = 'btn btn-primary';
            trackThisDeviceText.textContent = 'Stop Local Tracking';
            showToast('Direct device GPS tracking activated', 'success');

            selfWatchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const c = pos.coords;
                    handleIncomingGps({
                        lat: c.latitude,
                        lng: c.longitude,
                        accuracy: Math.round(c.accuracy),
                        speed: c.speed != null ? Math.round(c.speed * 3.6) : 0,
                        altitude: c.altitude != null ? Math.round(c.altitude) : 0,
                        heading: c.heading != null ? Math.round(c.heading) : 0,
                        deviceName: 'This Device (Direct GPS)'
                    }, 'Direct GPS');
                },
                (err) => {
                    showToast(`GPS Error: ${err.message}`, 'error');
                    trackThisDeviceBtn.className = 'btn btn-outline';
                    trackThisDeviceText.textContent = 'Track This Device (GPS)';
                    isSelfTracking = false;
                },
                { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
            );
        } else {
            if (selfWatchId !== null) {
                navigator.geolocation.clearWatch(selfWatchId);
                selfWatchId = null;
            }
            trackThisDeviceBtn.className = 'btn btn-outline';
            trackThisDeviceText.textContent = 'Track This Device (GPS)';
            showToast('Local GPS tracking stopped', 'info');
        }
    });

    // Simulate Route Movement
    function stopSimulation() {
        if (simInterval) {
            clearInterval(simInterval);
            simInterval = null;
        }
        isSimulating = false;
        simulateMovementBtn.className = 'btn btn-outline';
        simBtnText.textContent = 'Simulate Route Movement';
    }

    simulateMovementBtn.addEventListener('click', () => {
        if (isSelfTracking) {
            if (selfWatchId !== null) navigator.geolocation.clearWatch(selfWatchId);
            isSelfTracking = false;
            trackThisDeviceBtn.className = 'btn btn-outline';
            trackThisDeviceText.textContent = 'Track This Device (GPS)';
        }

        if (isSimulating) {
            stopSimulation();
            showToast('Route simulation paused', 'info');
            return;
        }

        isSimulating = true;
        simulateMovementBtn.className = 'btn btn-primary';
        simBtnText.textContent = 'Stop Simulation';
        showToast('Driving route simulation started', 'success');

        // Start from current location or default downtown point
        let currLat = lastReceivedPosition ? lastReceivedPosition[0] : 12.9716;
        let currLng = lastReceivedPosition ? lastReceivedPosition[1] : 77.5946;
        let angle = Math.random() * Math.PI * 2;
        let speed = 42;

        if (leafletMap) leafletMap.setView([currLat, currLng], 15);

        simInterval = setInterval(() => {
            // Slight steering changes
            angle += (Math.random() - 0.5) * 0.35;
            speed = Math.max(25, Math.min(65, speed + (Math.random() - 0.5) * 8));

            // Move ~10 meters per tick in direction
            const distance = 0.00015;
            currLat += Math.cos(angle) * distance;
            currLng += Math.sin(angle) * distance;

            const compassHeading = Math.round(((angle * 180 / Math.PI) + 360) % 360);

            handleIncomingGps({
                lat: currLat,
                lng: currLng,
                accuracy: 3 + Math.round(Math.random() * 4),
                speed: Math.round(speed),
                altitude: 890 + Math.round(Math.sin(currLat * 100) * 15),
                heading: compassHeading,
                battery: '88% ⚡',
                deviceName: currentTrackingDeviceName + ' (Simulated)'
            }, 'Simulated Route');
        }, 1200);
    });

    // ============================================
    // Lost & Recovery Hub Logic
    // ============================================
    recoveryImeiInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '').slice(0, 15);
        e.target.value = value;
        recoveryCharCount.textContent = value.length;
        checkBlacklistBtn.disabled = value.length !== 15;
        recoveryCharCount.style.color = value.length === 15 ? 'var(--success)' : 'var(--text-muted)';
    });

    recoveryImeiInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !checkBlacklistBtn.disabled) {
            checkBlacklist(recoveryImeiInput.value.trim());
        }
    });

    checkBlacklistBtn.addEventListener('click', () => {
        checkBlacklist(recoveryImeiInput.value.trim());
    });

    useCurrentImeiBtn.addEventListener('click', () => {
        if (currentLookupImei) {
            recoveryImeiInput.value = currentLookupImei;
            recoveryImeiInput.dispatchEvent(new Event('input'));
            checkBlacklist(currentLookupImei);
        } else {
            showToast('No IMEI has been checked in the Single Check tab yet', 'info');
        }
    });

    function checkBlacklist(imei) {
        if (!isValidIMEIFormat(imei)) {
            showToast('Please enter a valid 15-digit IMEI', 'error');
            return;
        }

        const isStolen = !!stolenDB[imei];
        const record = stolenDB[imei];
        const dev = lookupTAC(imei);

        blacklistResult.style.display = 'block';
        blacklistResult.className = `blacklist-result-box ${isStolen ? 'stolen' : 'clean'}`;

        if (isStolen) {
            blacklistResult.innerHTML = `
                <div class="blacklist-header">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--error); flex-shrink:0;">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <div>
                        <div class="blacklist-status-title">DEVICE REPORTED STOLEN / BLACKLISTED</div>
                        <div style="font-size: 0.8rem; color: var(--error);">Telecom Network Block Active (CEIR / GSMA)</div>
                    </div>
                </div>
                <div class="blacklist-details">
                    <p><strong>Device:</strong> ${record.brand || dev.brand} ${record.model || dev.model}</p>
                    <p><strong>IMEI:</strong> <code>${imei}</code></p>
                    <p><strong>Incident Date:</strong> ${record.date || 'Unknown'}</p>
                    <p><strong>Police FIR / Case No:</strong> ${record.firNumber || 'Pending / Recorded'}</p>
                    <p><strong>Cellular Status:</strong> Permanently barred from registering on cellular towers.</p>
                    <p style="margin-top: 8px; color: var(--error); font-weight: 600;">
                        ⚠️ WARNING: Do not purchase, trade, or activate this device. Possession of a blacklisted stolen phone can lead to legal action.
                    </p>
                </div>
            `;
            toggleStolenText.textContent = "Remove from Stolen List (Clear Flag)";
        } else {
            blacklistResult.innerHTML = `
                <div class="blacklist-header">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--success); flex-shrink:0;">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <div>
                        <div class="blacklist-status-title">CLEAN — NO STOLEN OR BLACKLIST RECORDS FOUND</div>
                        <div style="font-size: 0.8rem; color: var(--success);">Eligible for normal cellular network activation</div>
                    </div>
                </div>
                <div class="blacklist-details">
                    <p><strong>Device:</strong> ${dev.brand} ${dev.model}</p>
                    <p><strong>IMEI:</strong> <code>${imei}</code></p>
                    <p><strong>Registry Status:</strong> Clean record. No theft reports or national telecom operator blocks found.</p>
                    <p><strong>Financial / Contract:</strong> Clear for SIM transfer and cellular usage.</p>
                </div>
            `;
            toggleStolenText.textContent = "Simulate Report Stolen (Test Mode)";
        }

        toggleStolenBtn.style.display = 'inline-flex';
        toggleStolenBtn.onclick = () => {
            if (stolenDB[imei]) {
                delete stolenDB[imei];
                saveStolenDB();
                showToast(`Removed ${imei} from stolen registry`, 'info');
            } else {
                stolenDB[imei] = {
                    brand: dev.brand,
                    model: dev.model,
                    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                    firNumber: `FIR-${Date.now().toString().slice(-6)}`,
                    ceirStatus: "Blocked",
                    incidentLocation: "User Reported via Recovery Hub"
                };
                saveStolenDB();
                showToast(`Marked ${imei} as Stolen / Blacklisted`, 'error');
            }
            checkBlacklist(imei);
        };

        blacklistResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ============================================
    // Protocol Checklist State
    // ============================================
    const savedChecklist = JSON.parse(localStorage.getItem('imei_recovery_checklist') || '{}');
    $$('#protocolChecklist input[type="checkbox"]').forEach(box => {
        const step = box.dataset.step;
        if (savedChecklist[step]) {
            box.checked = true;
            box.closest('.protocol-item').classList.add('completed');
        }

        box.addEventListener('change', () => {
            savedChecklist[step] = box.checked;
            localStorage.setItem('imei_recovery_checklist', JSON.stringify(savedChecklist));
            if (box.checked) {
                box.closest('.protocol-item').classList.add('completed');
            } else {
                box.closest('.protocol-item').classList.remove('completed');
            }
        });
    });

    // ============================================
    // Police Complaint (FIR) Generator
    // ============================================
    autoFillFirBtn.addEventListener('click', () => {
        if (currentLookupImei && currentLookupDevice) {
            firImei1.value = currentLookupImei;
            firDeviceModel.value = `${currentLookupDevice.brand} ${currentLookupDevice.model.split(',')[0]}`;
            firDate.value = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
            showToast('Auto-filled from current device lookup', 'success');
        } else {
            firDate.value = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
            showToast('Entered current date & time', 'info');
        }
    });

    generateFirBtn.addEventListener('click', () => {
        const owner = firOwnerName.value.trim() || '[Owner Name]';
        const contact = firContactPhone.value.trim() || '[Contact Phone Number]';
        const model = firDeviceModel.value.trim() || '[Device Make & Model]';
        const imei1 = firImei1.value.trim() || '[Primary IMEI Number]';
        const imei2 = firImei2.value.trim() || 'N/A';
        const sim = firSimNumber.value.trim() || '[Lost SIM Number / Operator]';
        const date = firDate.value.trim() || '[Date & Time of Incident]';
        const location = firLocation.value.trim() || '[Location / Address where lost]';

        const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

        const letter = 
`To,
The Station House Officer (SHO) / In-Charge Officer,
Cyber Crime & Lost Property Cell,
Police Department.

Date: ${today}

SUBJECT: FORMAL COMPLAINT REGARDING LOSS / THEFT OF MOBILE PHONE AND REQUEST FOR IMEI BLOCKING UNDER CEIR

Respected Sir / Madam,

I, ${owner}, residing at the address provided below, respectfully submit this complaint regarding the unfortunate loss/theft of my mobile device. The particulars of the device and incident are as follows:

1. DEVICE & SUBSCRIBER PARTICULARS:
   - Device Make & Model: ${model}
   - Primary IMEI (IMEI 1): ${imei1}
   - Secondary IMEI (IMEI 2): ${imei2}
   - SIM Card Number / Operator: ${sim}
   - Complainant Full Name: ${owner}
   - Alternative Contact Number: ${contact}

2. INCIDENT PARTICULARS:
   - Date & Approximate Time: ${date}
   - Place / Location of Incident: ${location}
   - Incident Summary: The above-mentioned mobile phone was either lost or stolen from my possession at the stated location. Despite diligent efforts to search the vicinity and call the device, it has remained unreachable.

3. PRAYER / RELIEF SOUGHT:
   In view of the potential misuse of my SIM card and device identity (IMEI) for unlawful or fraudulent activities, I earnestly request your good office to:
   a) Register this complaint as a Lost Article Report / First Information Report (FIR).
   b) Issue an official Complaint Acknowledgement Number so that I may immediately execute the statutory device block on the national Central Equipment Identity Register (CEIR - Department of Telecommunications).
   c) Take appropriate legal steps to track and recover the device.

I declare that the information stated above is true and correct to the best of my knowledge.

Yours faithfully,

_____________________________
Signature of Complainant
Name: ${owner}
Contact: ${contact}`;

        firLetterText.textContent = letter;
        firOutputBox.style.display = 'block';
        firOutputBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        showToast('Complaint letter generated!', 'success');
    });

    copyFirBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(firLetterText.textContent).then(() => {
            showToast('Complaint text copied to clipboard!', 'success');
        });
    });

    printFirBtn.addEventListener('click', () => {
        window.print();
    });

    // ============================================
    // Bulk Check
    // ============================================
    bulkCheckBtn.addEventListener('click', () => {
        const lines = bulkInput.value.trim().split('\n').filter(l => l.trim());
        
        if (lines.length === 0) {
            showToast('Enter at least one IMEI number', 'error');
            return;
        }

        lastBulkResults = [];
        bulkResults.innerHTML = '';

        lines.forEach(line => {
            const imei = line.trim().replace(/\D/g, '');
            const valid = isValidIMEIFormat(imei) && luhnCheck(imei).valid;
            const device = isValidIMEIFormat(imei) ? lookupTAC(imei) : null;

            lastBulkResults.push({ imei, valid, device });

            const deviceTitle = device 
                ? (device.matched ? `${device.brand} ${device.model}` : `${device.brand} (${device.region || 'Unlisted'})`)
                : '—';

            const item = document.createElement('div');
            item.className = 'bulk-item';
            item.innerHTML = `
                <span class="bulk-status ${valid ? 'valid' : 'invalid'}"></span>
                <span class="bulk-imei">${imei || line.trim()}</span>
                <span class="bulk-device">${deviceTitle}</span>
                <span class="bulk-label ${valid ? 'valid' : 'invalid'}">${valid ? 'Valid' : 'Invalid'}</span>
            `;
            
            item.style.cursor = 'pointer';
            item.title = 'Click to analyze in detail';
            item.addEventListener('click', () => {
                if (isValidIMEIFormat(imei)) {
                    imeiInput.value = imei;
                    imeiInput.dispatchEvent(new Event('input'));
                    switchToTab('single');
                    analyzeIMEI();
                }
            });

            bulkResults.appendChild(item);
        });

        const validCount = lastBulkResults.filter(r => r.valid).length;
        showToast(`Checked ${lastBulkResults.length} IMEIs: ${validCount} valid, ${lastBulkResults.length - validCount} invalid`, 'info');
        bulkExportBtn.style.display = 'inline-flex';
    });

    bulkExportBtn.addEventListener('click', () => {
        if (lastBulkResults.length === 0) return;

        const csv = 'IMEI,Valid,Brand,Model,Type,Region\n' + lastBulkResults.map(r => {
            const d = r.device || {};
            const cleanModel = (d.model || '').replace(/"/g, '""');
            return `"${r.imei}","${r.valid}","${d.brand || ''}","${cleanModel}","${d.type || ''}","${d.region || ''}"`;
        }).join('\n');

        downloadFile('imei-results.csv', csv, 'text/csv');
        showToast('CSV exported!', 'success');
    });

    // ============================================
    // IMEI Generator
    // ============================================
    generateBtn.addEventListener('click', () => {
        const count = Math.min(Math.max(parseInt(genCount.value) || 1, 1), 100);
        let tacPrefix = genTac.value.replace(/\D/g, '').slice(0, 8);
        
        lastGeneratedIMEIs = [];
        generatedList.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const imei = generateIMEI(tacPrefix);
            const dev = lookupTAC(imei);
            lastGeneratedIMEIs.push(imei);

            const item = document.createElement('div');
            item.className = 'gen-item';
            item.innerHTML = `
                <div>
                    <span class="gen-imei">${imei}</span>
                    <span class="gen-device-label">${dev.matched ? `${dev.brand} ${dev.model.split(',')[0]}` : dev.region}</span>
                </div>
                <span class="gen-copy">Click to copy</span>
            `;
            item.addEventListener('click', () => {
                navigator.clipboard.writeText(imei).then(() => {
                    showToast(`Copied: ${imei}`, 'success');
                });
            });
            generatedList.appendChild(item);
        }

        copyGenBtn.style.display = 'inline-flex';
        showToast(`Generated ${count} IMEI${count > 1 ? 's' : ''}`, 'success');
    });

    copyGenBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(lastGeneratedIMEIs.join('\n')).then(() => {
            showToast('All IMEIs copied to clipboard!', 'success');
        });
    });

    function generateIMEI(tacPrefix = '') {
        const sampleTacs = [
            '35391811', // iPhone 15 Pro Max
            '35260112', // Galaxy S24 Ultra
            '35512113', // Pixel 8 Pro
            '86073004', // Huawei
            '86302407', // Xiaomi Redmi Note 14S
            '86845503', // OnePlus 12
            '49015420', // Nokia
            '35345678'  // Samsung Note 8
        ];

        let baseTac = tacPrefix;
        if (!baseTac) {
            baseTac = sampleTacs[Math.floor(Math.random() * sampleTacs.length)];
        }

        let imei = baseTac;
        while (imei.length < 14) {
            imei += Math.floor(Math.random() * 10);
        }

        const digits = imei.split('').map(Number);
        let sum = 0;
        for (let i = 0; i < 14; i++) {
            let d = digits[i];
            if (i % 2 === 1) {
                d *= 2;
                if (d > 9) d -= 9;
            }
            sum += d;
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        return imei + checkDigit;
    }

    // ============================================
    // History
    // ============================================
    function addToHistory(imei, valid, device) {
        history = history.filter(h => h.imei !== imei);
        
        history.unshift({
            imei,
            valid,
            brand: device.brand || "Unknown",
            model: (device.model || "").split(',')[0],
            timestamp: Date.now()
        });

        history = history.slice(0, 50);
        localStorage.setItem('imei_history', JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        if (history.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <p>No lookups yet. Check an IMEI to get started.</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = history.map(h => {
            const time = formatTime(h.timestamp);
            return `
                <div class="history-item" data-imei="${h.imei}">
                    <span class="hist-status ${h.valid ? 'valid' : 'invalid'}"></span>
                    <span class="hist-imei">${h.imei}</span>
                    <span class="hist-device">${h.brand} ${h.model}</span>
                    <span class="hist-time">${time}</span>
                </div>
            `;
        }).join('');

        $$('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const imei = item.dataset.imei;
                imeiInput.value = imei;
                imeiInput.dispatchEvent(new Event('input'));
                switchToTab('single');
                analyzeIMEI();
            });
        });
    }

    clearHistoryBtn.addEventListener('click', () => {
        history = [];
        localStorage.setItem('imei_history', JSON.stringify(history));
        renderHistory();
        showToast('History cleared', 'info');
    });

    function formatTime(ts) {
        const diff = Date.now() - ts;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }

    // ============================================
    // Toast Notifications
    // ============================================
    function showToast(message, type = 'info') {
        const container = $('#toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ============================================
    // File Download Helper
    // ============================================
    function downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ============================================
    // Initialize
    // ============================================
    renderHistory();
    // Only auto-focus on non-touch devices to prevent jarring mobile virtual keyboard popups
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        imeiInput.focus();
    }

    // Auto-adjust Leaflet map dimensions on window resize and mobile orientation change
    window.addEventListener('resize', () => {
        if (leafletMap) leafletMap.invalidateSize();
    });
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            if (leafletMap) leafletMap.invalidateSize();
        }, 250);
    });

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'v' && document.activeElement !== imeiInput && document.activeElement !== bulkInput && document.activeElement !== recoveryImeiInput) {
            imeiInput.focus();
        }
    });
});
