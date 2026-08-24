import mqtt from 'mqtt';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env variables
dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'led_truck_apps',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool;
try {
  pool = mysql.createPool(dbConfig);
  console.log(`[DB] Connected to MySQL database: ${dbConfig.database} @ ${dbConfig.host}:${dbConfig.port}`);
} catch (e) {
  console.error('[DB] Failed to initialize DB Pool:', e);
}

// MQTT Config from Foxlogger Docs
const mqttOptions = {
  clientId: 'foxlogger_collector_' + Math.random().toString(16).substring(2, 10),
  username: process.env.FOXLOGGER_MQTT_USER || 'foxlist',
  password: process.env.FOXLOGGER_MQTT_PASSWORD || 'pecellele2021',
  clean: true,
  connectTimeout: 8000,
  reconnectPeriod: 3000,
};

const wssUrl = process.env.FOXLOGGER_MQTT_WSS_URL || 'wss://mqtt.foxlogger.app/mqtt';
console.log(`[MQTT] Connecting to WSS server: ${wssUrl} ...`);

const client = mqtt.connect(wssUrl, mqttOptions);

// User IDs to listen to (Truck 1 & Truck 2 + default fallback)
const topics = [
  '17855737531475', // Centralledid168@gmail.com (Truck 1)
  '17641236001323', // Crs.advertising@gmail.com (Truck 2)
  '83428'           // Default / Fallback
];

client.on('connect', () => {
  console.log('[MQTT] Successfully CONNECTED to Foxlogger MQTT WSS Server!');
  topics.forEach(topic => {
    client.subscribe(topic, (err) => {
      if (!err) {
        console.log(`[MQTT] Subscribed to telemetry topic: ${topic}`);
      } else {
        console.error(`[MQTT] Failed to subscribe to topic ${topic}:`, err);
      }
    });
  });
});

client.on('message', async (topic, payload) => {
  try {
    const rawStr = payload.toString();
    const data = JSON.parse(rawStr);

    const imei = data.imei;
    if (!imei) return;

    const lat = parseFloat(data.lat || 0);
    const lng = parseFloat(data.lng || 0);
    const speed = parseFloat(data.spd || 0);
    const status = (data.sts || (speed > 0 ? 'MOVE' : 'OFF')).toUpperCase();
    const engine = (data.eng === '1' || data.eng === 1 || speed > 0) ? 'ON' : 'OFF';
    const nopl = data.nopl || (imei === '0356153590691330' ? 'B 9731 JXS' : 'B 9729 JXS');
    const mileage = parseFloat(data.mil || 0);
    const loggedAt = data.las ? data.las.trim() : new Date().toISOString().replace('T', ' ').substring(0, 19);
    const logDate = loggedAt.substring(0, 10);

    console.log(`[GPS LIVE] ${loggedAt} | ${nopl} (${imei}) | Lat: ${lat}, Lng: ${lng} | Spd: ${speed} km/h | Sts: ${status}`);

    if (pool) {
      const query = `
        INSERT INTO gps_telemetry_logs 
          (imei, truck_plate, log_date, logged_at, latitude, longitude, speed, status, engine_status, mileage_km, raw_payload, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          truck_plate = VALUES(truck_plate),
          log_date = VALUES(log_date),
          latitude = VALUES(latitude),
          longitude = VALUES(longitude),
          speed = VALUES(speed),
          status = VALUES(status),
          engine_status = VALUES(engine_status),
          mileage_km = VALUES(mileage_km),
          raw_payload = VALUES(raw_payload),
          updated_at = NOW()
      `;

      await pool.execute(query, [
        imei,
        nopl,
        logDate,
        loggedAt,
        lat,
        lng,
        speed,
        status,
        engine,
        mileage > 0 ? mileage : null,
        rawStr,
      ]);
    }
  } catch (err) {
    console.error('[MQTT WSS Process Error]:', err.message);
  }
});

client.on('error', (err) => {
  console.error('[MQTT Error]:', err.message);
});

client.on('offline', () => {
  console.warn('[MQTT] Client is currently offline, attempting reconnection...');
});

client.on('reconnect', () => {
  console.log('[MQTT] Reconnecting to Foxlogger MQTT WSS server...');
});
