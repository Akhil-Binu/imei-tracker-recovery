import csv
import json
import os
import time

print("Building comprehensive TAC database...")
t0 = time.time()

# Common brand formatting overrides
BRAND_FORMAT = {
    "APPLE": "Apple",
    "SAMSUNG": "Samsung",
    "GOOGLE": "Google",
    "XIAOMI": "Xiaomi",
    "REDMI": "Redmi (Xiaomi)",
    "POCO": "POCO (Xiaomi)",
    "ONEPLUS": "OnePlus",
    "HUAWEI": "Huawei",
    "HONOR": "Honor",
    "OPPO": "OPPO",
    "VIVO": "Vivo",
    "REALME": "Realme",
    "MOTOROLA": "Motorola",
    "NOKIA": "Nokia",
    "SONY": "Sony",
    "SONY ERICSSON": "Sony Ericsson",
    "LG": "LG",
    "ASUS": "Asus",
    "ZTE": "ZTE",
    "NOTHING": "Nothing",
    "TECNO": "Tecno",
    "INFINIX": "Infinix",
    "ITEL": "Itel",
    "ALCATEL": "Alcatel",
    "LENOVO": "Lenovo",
    "TCL": "TCL",
    "HTC": "HTC",
    "BLACKBERRY": "BlackBerry",
    "MEIZU": "Meizu",
    "QUECTEL": "Quectel (IoT/Modem)",
    "SIMCOM": "SIMCom (IoT/Modem)",
    "FIBOCOM": "Fibocom (IoT/Modem)",
    "TELIT": "Telit (IoT/Modem)",
    "SIERRA WIRELESS": "Sierra Wireless",
}

# Reporting Body Identifiers (first 2 digits of TAC)
RBI_INFO = {
    "01": {"name": "PTCRB / CTIA", "region": "United States & Canada"},
    "30": {"name": "Iridium Satellite LLC", "region": "Global Satellite"},
    "33": {"name": "DGPT / ARCEP", "region": "France / Europe"},
    "35": {"name": "BABT (British Approvals Board for Telecommunications)", "region": "United Kingdom / Global"},
    "44": {"name": "BABT (British Approvals Board for Telecommunications)", "region": "United Kingdom"},
    "45": {"name": "NNC (National Telecom Agency)", "region": "Denmark / Nordic"},
    "49": {"name": "BZT / BNetzA (Federal Network Agency)", "region": "Germany / Europe"},
    "50": {"name": "CETECOM ICT Services", "region": "Germany / Europe"},
    "51": {"name": "CETECOM ICT Services", "region": "Germany / Europe"},
    "52": {"name": "CETECOM ICT Services", "region": "Germany / Europe"},
    "53": {"name": "TÜV Rheinland", "region": "Germany / Europe"},
    "54": {"name": "TÜV Product Service", "region": "Germany / Europe"},
    "86": {"name": "TAF (Telecommunication Terminal Testing Forum)", "region": "China / Asia"},
    "91": {"name": "MSI / TEC (Telecommunication Engineering Centre)", "region": "India / South Asia"},
    "98": {"name": "BABT (CDMA Multi-mode)", "region": "United Kingdom / Global"},
    "99": {"name": "TIA (Telecommunications Industry Association)", "region": "United States (CDMA)"},
}

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(ROOT_DIR, 'tac_full.csv')
OUTPUT_JS_PATH = os.path.join(ROOT_DIR, 'tac-database.js')

database = {}

with open(CSV_PATH, 'r', encoding='utf-8', errors='ignore') as f:
    reader = csv.reader(f)
    next(reader) # skip header
    for row in reader:
        if len(row) >= 3:
            raw_brand = row[0].strip()
            raw_tac = row[1].strip()
            raw_specs = row[2].strip()

            if not raw_tac or not raw_tac.isdigit() or len(raw_tac) > 8:
                continue

            tac = raw_tac.zfill(8)
            upper_brand = raw_brand.upper()
            brand = BRAND_FORMAT.get(upper_brand, raw_brand.title() if raw_brand.isupper() else raw_brand)

            # Clean specs
            specs = raw_specs
            # Strip redundant brand name if leading
            if specs.upper().startswith(raw_brand.upper()):
                specs = specs[len(raw_brand):].lstrip(' ,-:/')
            if not specs:
                specs = brand + " Mobile Device"

            # Determine device type
            specs_lower = specs.lower()
            if any(k in specs_lower for k in ['tablet', 'tab', 'ipad', 'pad']):
                dev_type = "Tablet"
            elif any(k in specs_lower for k in ['watch', 'wear']):
                dev_type = "Smartwatch"
            elif any(k in specs_lower for k in ['router', 'cpe', 'modem', 'dongle', 'gateway', 'mifi', 'hotspot']):
                dev_type = "Modem / Router"
            elif any(k in specs_lower for k in ['tracker', 'gps', 'obd']):
                dev_type = "GPS / Asset Tracker"
            elif any(k in specs_lower for k in ['module', 'iot', 'iot/modem']):
                dev_type = "IoT Module"
            else:
                dev_type = "Smartphone"

            if tac not in database:
                database[tac] = [brand, specs, dev_type]

print(f"Processed {len(database)} TAC entries in {time.time() - t0:.2f}s")

# Create Javascript file
js_header = """/**
 * Comprehensive TAC (Type Allocation Code) Database
 * 275,000+ mobile device entries sourced from GSMA, Osmocom, and public telecom authorities.
 * Provides instant offline identification of Brand, Model, and Device Category.
 */

const RBI_DATABASE = """ + json.dumps(RBI_INFO, indent=4) + """;

const TAC_DB_MAP = """ + json.dumps(database, separators=(',', ':')) + """;

/**
 * Fast lookup function for device details by IMEI or 8-digit TAC.
 */
function lookupTAC(imei) {
    if (!imei || imei.length < 8) {
        return {
            brand: "Unknown",
            model: "Invalid or Short IMEI",
            type: "Unknown",
            tac: "",
            matched: false
        };
    }

    const tac = imei.substring(0, 8);
    const rbi = imei.substring(0, 2);
    const rbiData = RBI_DATABASE[rbi] || { name: "Unknown Authority", region: "International" };

    // 1. Direct TAC match
    if (TAC_DB_MAP[tac]) {
        const [brand, model, type] = TAC_DB_MAP[tac];
        return {
            brand: brand,
            model: model,
            type: type,
            tac: tac,
            rbi: rbi,
            allocatingBody: rbiData.name,
            region: rbiData.region,
            matched: true,
            source: "Local Database"
        };
    }

    // 2. Try legacy 6-digit TAC match
    const tac6 = imei.substring(0, 6);
    for (const key in TAC_DB_MAP) {
        if (key.startsWith(tac6)) {
            const [brand, model, type] = TAC_DB_MAP[key];
            return {
                brand: brand,
                model: model + " (Variant)",
                type: type,
                tac: tac,
                rbi: rbi,
                allocatingBody: rbiData.name,
                region: rbiData.region,
                matched: "partial",
                source: "Local Partial Match"
            };
        }
    }

    // 3. Fallback: Identify allocating authority & region
    return {
        brand: "Pending / Unknown",
        model: "Unknown Model (" + rbiData.region + ")",
        type: "Mobile Device",
        tac: tac,
        rbi: rbi,
        allocatingBody: rbiData.name,
        region: rbiData.region,
        matched: false,
        source: "None"
    };
}
"""

with open(OUTPUT_JS_PATH, 'w', encoding='utf-8') as f:
    f.write(js_header)

size_mb = os.path.getsize(OUTPUT_JS_PATH) / (1024 * 1024)
print(f"Generated tac-database.js ({size_mb:.2f} MB)")
