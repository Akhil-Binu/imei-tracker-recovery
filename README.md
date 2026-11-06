# IMEI Tracker & Recovery Hub 🛰️📱

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Release Version](https://img.shields.io/badge/version-1.0.0-emerald.svg)](package.json)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20PWA-informational.svg)](https://github.com/Akhil-Binu/imei-tracker-recovery)
[![Code of Conduct](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)

> An open-source, offline-first mobile hardware identifier, Luhn validator, real-time GPS radar tracking system, and lost-device emergency recovery hub.

---

## 🌐 Live Demo & Deployment

- **Production Deployment (Vercel)**: [https://imei-hazel.vercel.app](https://imei-hazel.vercel.app)
- **Live Beacon Transmitter**: [https://imei-hazel.vercel.app/beacon.html](https://imei-hazel.vercel.app/beacon.html)

---

## 🚀 Key Features

### 1. Single IMEI Validation & Identification
- **Luhn Algorithm Checksum**: Mathematically verifies 15-digit IMEI checksum conformity with 3GPP/GSMA specifications.
- **275,000+ Offline Device Catalog**: Instant client-side lookup for Brand, Model, Allocation Body, Origin Region, and Form Factor (Smartphone, Tablet, Smartwatch, IoT module, GPS tracker).
- **Structural Decomposition**: Color-coded visualization isolating TAC (Type Allocation Code, 8 digits), Serial Number (6 digits), and Check Digit (1 digit).
- **Reporting Body Identification (RBI)**: Maps prefix allocations (e.g., `01` = PTCRB/US, `35` = BABT/UK, `86` = TAF/China, `91` = TEC/India).
- **Live GSMA Fallback**: Automated asynchronous lookup against online registries for newly released device hardware.

### 2. Live GPS Telemetry Radar Map
- **Cross-Device Tracking**: Real-time GPS coordinate streaming between remote phones and desktop radar via HiveMQ MQTT WebSockets (`wss://broker.hivemq.com:8884/mqtt`).
- **Zero-Latency Local Channel**: `BroadcastChannel` and `localStorage` events for instant synchronization when running across tabs or windows.
- **Transmitter Beacon (`beacon.html`)**: Mobile-optimized telemetry sender reporting latitude, longitude, speed (km/h), heading, altitude, accuracy, and live battery level.
- **Radar HUD**: Live telemetry heads-up display with dynamic breadcrumb trail polylines and precision accuracy circles rendered with Leaflet.
- **Route Simulator**: Built-in driving movement simulation mode with dynamic speed, bearing, and altitude variance for demonstration without physical GPS movement.

### 3. Lost & Stolen Device Recovery Hub
- **Blacklist Registry Verification**: Rapidly check if a device is flagged as stolen or barred from cellular networks.
- **6-Step Emergency Checklist**: Interactive recovery protocol with persistent local storage tracking (SIM blocking, Cloud Lost Mode, Police FIR, CEIR national registry block, UPI/Netbanking de-registration, Password revocation).
- **Official Portal Shortcuts**: One-click integration with India's Sanchar Saathi (CEIR), Google Find My Device, Apple iCloud Find My, and CTIA Stolen Phone Checker.
- **Police Complaint (FIR) Generator**: Auto-generates a standardized legal complaint letter formatted for Cyber Crime and police departments, with print-ready CSS formatting for direct PDF export or paper filing.

### 4. Bulk Processing & Generator
- **Batch Validation**: Process dozens of IMEIs in one click with instant status indicators.
- **CSV Data Export**: Download batch validation results with brand, model, type, and regional specs.
- **IMEI Generator**: Generate synthetically valid 15-digit IMEIs with mathematically accurate Luhn check digits and realistic manufacturer TAC prefixes (Apple, Samsung, Google Pixel, Xiaomi, OnePlus, Nokia).

---

## 🛠️ Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                              Client Browser                            │
│                                                                        │
│   ┌──────────────────┐    ┌─────────────────┐    ┌─────────────────┐   │
│   │ Single Check &   │    │ Radar Dashboard │    │ Recovery Hub &  │   │
│   │ Device Analysis  │    │  (Leaflet map)  │    │  FIR Generator  │   │
│   └─────────┬────────┘    └────────▲────────┘    └─────────────────┘   │
│             │                      │                                   │
│             ▼                      │                                   │
│   ┌──────────────────┐             │                                   │
│   │ 275k+ TAC Engine │             │                                   │
│   │(tac-database.js) │             │ (Live telemetry stream)           │
│   └──────────────────┘             │                                   │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           │                                                   │
┌──────────▼───────────────┐                       ┌───────────▼───────────┐
│     BroadcastChannel     │                       │ HiveMQ MQTT WebSocket │
│  (Instant same-device)   │                       │ (Remote Phone Beacon) │
└──────────────────────────┘                       └───────────────────────┘
```

- **Frontend Core**: Vanilla ES6+ JavaScript, CSS3 custom variables, semantic HTML5
- **Geospatial Engine**: [Leaflet.js](https://leafletjs.com/) with CartoDB Voyager tiles
- **Real-Time Streaming**: [MQTT.js](https://github.com/mqttjs/MQTT.js) over Secure WebSockets (WSS) & HTML5 `BroadcastChannel`
- **Device Database**: Compiled from GSMA and Osmocom public records using Python 3

---

## 📦 Quick Start & Local Development

No compiler or package manager is required. The app runs directly in any modern browser:

### 1. Clone the Repository
```bash
git clone https://github.com/Akhil-Binu/imei-tracker-recovery.git
cd imei-tracker-recovery
```

### 2. Launch Local Server
You can serve the static directory using Python, Node, or VS Code Live Server:

```bash
# Using Python
python -m http.server 8080

# Using Node.js (npx)
npx serve .
```

Open `http://localhost:8080` in your browser.

---

## 🗄️ Recompiling the TAC Database

If you modify or update `tac_full.csv` with new TAC allocations:

```bash
python scripts/build_tac_database.py
```

This processes the CSV and rebuilds `tac-database.js` with structured object maps and the legacy 6-digit matcher.

---

## 📂 Project Directory Layout

```
imei-tracker-recovery/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
├── index.html               # Main dashboard UI & views
├── beacon.html              # Mobile GPS telemetry transmitter
├── app.js                   # Application state, mapping & event handlers
├── style.css                # Dark/Light theme, animations & print styles
├── build_tac_database.py    # Python compiler for TAC CSV to JS
├── tac-database.js          # Compiled 275k+ device allocation database
├── tac_full.csv             # Raw GSMA/Osmocom TAC source dataset
├── leaflet.js / leaflet.css # Offline mapping dependencies
├── mqtt.min.js              # MQTT WebSocket client library
├── package.json             # NPM package manifest & metadata
├── pyproject.toml           # Python tool configuration
├── CONTRIBUTING.md          # Contribution guidelines
├── CODE_OF_CONDUCT.md       # Community standards
├── SECURITY.md              # Security and vulnerability reporting
└── LICENSE                  # MIT License
```

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on code style, commit standards, and the pull request process.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add support for new TAC allocations'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🛡️ Security

For vulnerability disclosures and reporting procedures, please refer to [SECURITY.md](SECURITY.md).

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.

---

**Author**: [Akhil Binu](https://github.com/Akhil-Binu)
