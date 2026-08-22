# Product Requirement Document (PRD) - LED-FLX Mobile LED Control & Analytics Platform

**Document Version:** 1.0.0  
**Status:** Approved  
**Target Platform:** Web (Desktop & Mobile Responsive)  
**Target URL Reference:** [https://led-truck-dashboard2.ai.studio/](https://led-truck-dashboard2.ai.studio/)

---

## 1. Executive Summary & Vision

**LED-FLX** is an enterprise-grade mobile LED truck control and audience analytics dashboard designed to optimize Out-of-Home (OOH) mobile billboard advertising. It seamlessly bridges real-time IoT hardware telemetry (LED screens, NovaStar controllers, GPS trackers, CCTV multi-angle cameras) with AI-powered audience counting, automated campaign documentation, and executive AI summary generation.

### 1.1 Problem Statement
Traditional mobile LED billboard operations suffer from:
1. **Lack of Proof-of-Play & Transparency:** Advertisers receive minimal verifiable proof of when, where, and for how long their ads were rendered.
2. **Inaccurate Impression Data:** Traditional OOH relies on static historical road density estimations rather than real-time vehicle and pedestrian detection.
3. **Fragmented Fleet Management:** Drivers, operations teams, and clients use disjointed tools for GPS tracking, screen monitoring, playlog management, and documentation.

### 1.2 Core Value Proposition
- **Real-Time Telemetry & Surveillance:** Instant visibility into vehicle speed, location, screen health, and active live camera feeds.
- **AI-Powered Audience Detection:** Computer vision camera feeds (Front, Side, Rear) counting real-time pedestrians, motorcycles, cars, and buses.
- **Automated AI Executive Reporting:** One-click Gemini AI analysis synthesizing telemetry, traffic density, and campaign impressions into actionable executive summaries.
- **End-to-End Playlist & Playlog Management:** Real-time playlist execution with instant screen switching and campaign documentation uploads.

---

## 2. Target Audience & User Personas

| Persona | Role | Key Needs | Primary Features Used |
|---|---|---|---|
| **Fleet Ops Manager** | Operations & Hardware | Monitor truck status, screen operational status, hardware controllers, CCTV feeds, and GPS routes. | Main Dashboard, Live CCTV, GPS Tracking |
| **Media Planner / Ad Operations** | Playlist & Client Relations | Schedule ad campaigns, trigger live playback, upload proof-of-play documentation. | Playlog & Playlist, Campaign Documentation |
| **Brand Advertiser / Client** | Campaign Performance | Track daily impressions, reach, location heatmaps, and generate executive summaries. | AI Summary, Traffic Analytics, Detailed Reports |

---

## 3. Functional Requirements & Feature Breakdown

### Module 1: Main Dashboard & AI Executive Summary
- **Multi-Vehicle Selector:** Switch views across the active fleet (e.g., `LED Truck Giga 01 (B 9482 LED)`, `LED Truck Giga 02 (B 9120 KLP)`, `LED Truck Giga 03 (B 9044 PLD)`).
- **Vehicle & Telemetry Card:** Live speed (km/h), operational state (`ON / LIVE`), hardware controller info (e.g., Novastar T60 Controller).
- **Daily Airtime Metric:** Cumulative daily minutes broadcasted and total play counts.
- **Audience Reach Card:** Estimated daily total impressions / unique audience reached.
- **Now Playing Card:** Current active campaign banner, client name, remaining play time, impressions achieved, and percentage completed.
- **Gemini AI Executive Report Generator:**
  - One-click "Buat Laporan AI" action button.
  - Interactive multi-section modal/card rendering executive overview, performance metrics, geographic impact analysis, traffic peak distribution, and strategic recommendations.
  - Print/export capability.

### Module 2: Live CCTV Monitoring
- **Multi-Angle Camera Feeds:** Switch between Camera 1 (Front/Driver Road View), Camera 2 (Side Walkway View), and Camera 3 (Rear Vehicle Traffic View).
- **Corridor Map Overlay:** Visual representation of key route corridors (e.g., Sudirman - Gatot Subroto CBD).
- **Status Indicators:** Live latency, frame rates, and camera connectivity diagnostics.

### Module 3: GPS Tracking & Telemetry
- **Interactive Route Map:** Live coordinates and historical path visualization.
- **Telemetry Readout:** Satellites locked count, odometer (km), current street address, and active speed.
- **Simulation Control:** Next Step / Route simulation trigger for testing and demonstration purposes.

### Module 4: Playlog & Playlist Management
- **Active Playlist Table:** List of scheduled, active, and queued video/graphic ad materials.
- **Instant Play Switch:** "Tayangkan" (Broadcast Now) button to force-override current broadcast screen with a selected ad material.
- **Add New Material Modal:**
  - Form fields: Campaign Name, Client Name, Duration (15s / 30s / 60s), Target Impressions, Thumbnail Image URL.
  - Dynamic update to queue upon submission.

### Module 5: Campaign Documentation (Proof of Play)
- **Photo Evidence Stream:** Timestamped and geo-tagged proof-of-play images grouped by corridor (Bundaran HI, Sudirman, Kuningan).
- **Manual Upload Modal:** File upload dropzone with metadata fields (Client name, Location tag, Notes) for field operators.

### Module 6: Traffic Analytics & AI Sensor Detection
- **Real-Time Sensor Count:** Live stream counter of detected Motorcycles, Cars, and Pedestrians.
- **CCTV Viewport Selector:** Toggle detection logs by angle (Rear / Side / Front).
- **Live AI Detection Log Stream:** Scrolling log feed with timestamps, object tags, and confidence levels.

### Module 7: Detailed Reports & Historical Analytics
- **Aggregated Metrics:** Cumulative totals for captured vehicles, pedestrians, and overall impressions.
- **Timeframe Filters:** Daily, Weekly, Monthly, and Custom date pickers.
- **Interactive Breakdown Table:** Selectable date rows (e.g., `Jumat, 17 Juli 2026`) that dynamically update side cards with hourly traffic breakdowns and peak density metrics.

---

## 4. Technical Architecture & UI/UX Design

### 4.1 Frontend UI/UX Standards
- **Theme & Palette:** Dark futuristic/command-center glassmorphism aesthetic (`#0b0f19` dark background, translucent slate panels, neon cyan/green accent status badges).
- **Typography:** Modern clean sans-serif typography (Inter / System UI font family).
- **Layout:** Collapsible left sidebar navigation + fixed top header (Fleet selector, user profile) + fluid content grid.
- **Interactivity:** Micro-animations on status badges, smooth transitions, instant filter reactivity.

### 4.2 Tech Stack Architecture
- **Framework:** Next.js / Vite (React 18+) with Inertia.js / Tailwind CSS or custom glassmorphism CSS components.
- **Icons & Visuals:** Lucide React icons, Leaflet / Mapbox interactive maps.
- **AI Integration:** Serverless endpoint `/api/gemini/generate-report` connecting to Google Gemini API for executive campaign synthesis.

---

## 5. Non-Functional Requirements

- **Performance:** Initial page load under 1.5 seconds; tab transitions under 100ms.
- **Responsiveness:** Fully functional on mobile viewports (smartphones, tablets) as well as command center desktop monitors.
- **Reliability:** Graceful handling of hardware offline states or CCTV camera signal losses.
- **Scalability:** Support for extending fleet size to 100+ active mobile trucks seamlessly.

---

## 6. Release Roadmap & Milestones

- **Phase 1 (V1.0 - Current):** Core Dashboard, Live CCTV, GPS Tracker, Playlist Management, Manual Upload, Traffic Analytics, and Gemini AI Executive Summaries.
- **Phase 2 (V1.1 - Upcoming):** Real-Time WebSocket stream for physical IoT hardware controllers, automated CSV/PDF report export, automated client email notifications.
- **Phase 3 (V1.2):** Programmatic ad bidding integration and real-time dynamic route re-routing based on traffic density algorithms.
