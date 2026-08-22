# API Documentation - Foxlogger & LED-FLX Platform Integration

**Version:** 1.0.0  
**Auth Types:** Basic Auth, Bearer Token (JWT), MQTT WSS  
**Base URLs:**  
- Auth API: `https://api-auth.foxlogger.app`  
- Core V2 API: `https://api-v2.foxlogger.app`  
- Video Streaming: `https://streamv.foxlogger.info`  
- Video Control API: `https://streamv-api.foxlogger.info`  
- MQTT Server: `wss://mqtt.foxlogger.app/mqtt`

---

## 1. Authentication & Session Management

### 1.1 Authentication / Get API Key
* **URL:** `https://api-auth.foxlogger.app/users/authentication`
* **Method:** `GET`
* **Auth:** `Basic Auth` (Input email and password account)
* **Response Example:**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "access_token": "[Bearer Token]",
    "refresh_token": "[Bearer Token]"
  }
}
```
> **Note:** `access_token` yang didapat harus diekstrak menggunakan parser JWT untuk mendapatkan klaim `user_id`.

---

### 1.2 Refresh Token / Refresh API Key
* **URL:** `https://api-auth.foxlogger.app/users/refresh-token`
* **Method:** `POST`
* **Body Format:** `JSON (raw)`
* **Request Body:**
```json
{
  "refresh_token": "[Bearer Token]"
}
```
* **Response Example:**
```json
{
  "success": true,
  "message": "Record found",
  "data": {
    "access_token": "[Bearer Token]",
    "refresh_token": "[Bearer Token]"
  }
}
```

---

## 2. Fleet & Device Management

### 2.1 Get Device Lists
* **URL:** `https://api-v2.foxlogger.app/user_data_all/{user_id}`
* **Method:** `GET`
* **Auth:** `Bearer Token` (Header: `Authorization: Bearer {access_token}`)
* **Response Example:**
```json
{
  "data": [
    {
      "id": "83428-0352503093112346",
      "imei": "0352503093112346",
      "gps_name": "B 1234 TEST",
      "driver_name": "khadiq ansori",
      "driver_phone": "",
      "enabled": true,
      "last_latitude": -6.16608,
      "last_longitude": 106.81034,
      "last_speed": 0,
      "last_time": "2024-03-20 17:34:52",
      "user_id": 83428,
      "tracker_type": "FL212",
      "vehicle_fuel_consumption": 8,
      "simcard_number": "628123451235"
    }
  ],
  "message": "Record found",
  "success": true
}
```

---

## 3. Real-Time Telemetry & Video Streaming

### 3.1 Get Real-Time Telemetry (MQTT)
* **URL:** `wss://mqtt.foxlogger.app/mqtt`
* **Port:** `443`
* **User:** `foxlist`
* **Password:** `pecellele2021`
* **Topic:** `{user_id}`

---

### 3.2 Activate Live Camera Stream Instruction
* **URL:** `https://api-v2.foxlogger.app/send_instruct`
* **Method:** `POST`
* **Body Format:** `JSON (raw)`
* **Request Body:**
```json
{
  "imei": "352503093112346",
  "channel": "0",
  "user_id": 83428
}
```
> **Note:** Value `imei` dipasing tanpa angka `0` di depan. Channel `0` (Front camera) atau `1` (Rear/Side camera).

---

### 3.3 Camera Live Stream (FLV Video Stream)
* **URL:** `https://streamv.foxlogger.info/live/{channel}/{imei}.flv`
* **Method:** `GET`
* **Response:** Direct FLV Live Video Stream (dapat diputar menggunakan `flv.js` / HTML5 video player).

---

### 3.4 Camera History Stream (Playback Steps)

#### Step 1: Generate File History
* **URL:** `https://streamv-api.foxlogger.info/api/device/sendInstruct`
* **Method:** `POST`
* **Body Format:** `x-www-form-urlencoded`
```text
imei: 864993060030716
cmdContent: FILELIST
serverFlagId: 1
proNo: 128
platform: web
requestId: 6
cmdType: normalIns
token: 123
```

#### Step 2: Get File History List
* **URL:** `https://api-v2.foxlogger.app/find_all_filelist?start_date={start_date}&end_date={end_date}&imei={imei}&channel={channel}`
* **Method:** `GET`
* **Auth:** `Bearer Token` (`access_token`)
* **Query Parameters:** `start_date` & `end_date` format `yyyy-MM-dd hh:mm:ss`
* **Response Example:**
```json
{
  "data": {
    "detail": [
      {
        "file_channel": 1,
        "file_name": "2024_10_03_23_34_16_01.mp4",
        "file_time": "2024-10-03 23:34:16"
      }
    ]
  }
}
```

#### Step 3: Request Watch History
* **URL:** `https://streamv-api.foxlogger.info/api/device/sendInstruct`
* **Method:** `POST`
* **Body Format:** `x-www-form-urlencoded`
```text
imei: 864993060030716
cmdContent: REPLAYLIST,{file_name}
serverFlagId: 1
proNo: 128
platform: web
requestId: 6
cmdType: normalIns
token: 123
```

#### Step 4: Stream Watch History
* **URL:** `https://streamv.foxlogger.info/live/{imei}.flv`

---

## 4. Reports & Analytics APIs

### 4.1 Get Report History
* **URL:** `https://api-v2.foxlogger.app/web-tracker-staging/report-history?imei={imei}&user_id={user_id}&time1={start_time}&time2={end_time}`
* **Method:** `GET`
* **Auth:** `Bearer Token`
* **Response Example:**
```json
{
  "Pesan": "",
  "data": [
    {
      "Dist": "0.00",
      "Mill": 28.84114,
      "Power": 5,
      "Speed": 1,
      "addr": "Jalan Cideng Barat, Gambir, Jakarta Pusat",
      "engi": "ON",
      "lat": -6.166082,
      "long": 106.810348,
      "time": "2024-12-16 00:00:48"
    }
  ],
  "status": 202
}
```

---

### 4.2 Get Report Position
* **URL:** `https://api-v2.foxlogger.app/web-tracker-staging/report-position/{user_id}?status=MOVE,PARK,OFF,MISS`
* **Method:** `GET`
* **Auth:** `Bearer Token`

---

### 4.3 Get Report Speed
* **URL:** `https://api-v2.foxlogger.app/web-tracker-staging/report-speed?imei={imei}&user_id={user_id}&time1={start_time}&time2={end_time}`
* **Method:** `GET`
* **Auth:** `Bearer Token`

---

### 4.4 Get Report Fuel Usage
* **URL:** `https://api-v2.foxlogger.app/web-tracker-staging/report-fuel?imei={imei}&user_id={user_id}&time1={start_time}&time2={end_time}&param=8`
* **Method:** `GET`
* **Auth:** `Bearer Token`

---

### 4.5 Geofence & POI Reports

#### Get List POI / Geofences
* **URL:** `https://api-v2.foxlogger.app/geo-fences/{user_id}`
* **Method:** `GET`

#### Get Report POI By Area
* **URL:** `https://api-v2.foxlogger.app/web-tracker-staging/report-poi?geofence_id={geo_fence_id}&time1={start_time}&time2={end_time}`
* **Method:** `GET`

#### Get Report POI By Device
* **URL:** `https://api-v2.foxlogger.app/web-tracker-staging/report-poi?imei={imei}&user_id={user_id}&time1={start_time}&time2={end_time}`
* **Method:** `GET`

---

### 4.6 Get Report Park & Summary

#### Get Report Park
* **URL:** `https://api-v2.foxlogger.app/web-tracker-staging/report-park?imei={imei}&user_id={user_id}&time1={start_time}&time2={end_time}`
* **Method:** `GET`

#### Get Report Summary
* **URL:** `https://api-v2.foxlogger.app/web-tracker/report-summary?imei={imei}&user_id={user_id}&time1={start_time}&time2={end_time}`
* **Method:** `GET`

#### Get Report Alarm (Power Cut / Fuel Steal)
* **URL:** `https://api-v2.foxlogger.app/web-tracker-staging/report-cut-power/{user_id}`
* **Method:** `GET`
