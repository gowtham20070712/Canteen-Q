# 🍔 Canteen Queue AI - Web Prototype

A modern, high-fidelity web application prototype for **Canteen Queue AI**, an intelligent campus dining system designed to eliminate cafeteria bottlenecks, predict rush-hour congestion, provide real-time queue position tracking, and streamline kitchen order operations.

---

## 🚀 How to Run the Prototype

**Zero installation required!** No Node.js, Python, or external servers are needed:
1. Open the project folder: `c:\Users\user\Desktop\document\`
2. Double-click **`index.html`** to launch the prototype directly in Microsoft Edge, Google Chrome, Mozilla Firefox, or any modern web browser.
3. *(Pro Tip for Dual-Screen / Multi-Tab Demo)*: Open `index.html` in **two separate browser windows** side-by-side:
   - Window 1: **Student Portal**
   - Window 2: **Staff Dashboard**
   - Click *"Advance Position"* or *"Call Next"* in the Staff window and watch the Student window update in real-time!

---

## 🎯 Key Features & Requirements Walkthrough

### 1. 🏠 Home / Universal Dashboard
- **🍔 Canteen Queue AI Branding**: Campus dining header with counter indicator.
- **Current Queue**: **18 students** waiting in line.
- **Estimated Waiting Time**: **12 min** (dynamically calculated based on queue size and service rate).
- **Average Service Time**: **40 sec / student** throughput metric.
- **Queue Status Indicator**:
  - 🟢 **Low** (< 8 students)
  - 🟡 **Medium** (8 – 15 students)
  - 🔴 **High** (> 15 students) — currently active at 18 students.
- **AI Recommendation Flash**: Immediate advice on current waiting conditions and best order windows.

---

### 2. 🔐 Separate Student & Staff Logins
Click **"🔑 Switch Login"** in the top-right navbar to access dedicated portals:
- **🎓 Student Login**:
  - Roll Number / Campus Email & PIN fields.
  - **1-Click Quick Presets**:
    - *Alex Carter* (`ST-CS2104`, Computer Science) — linked to active ticket #Q-12.
    - *Priya Sharma* (`ST-EC1092`, Electronics Eng.).
- **👨‍🍳 Staff Login**:
  - Staff Employee Badge & Kitchen Security Key.
  - **1-Click Quick Presets**:
    - *Chef Ramirez* (`EMP-409`, Counter #1 Express Meals).
    - *Manager Sarah* (`EMP-102`, Cafeteria Supervisor).

---

### 3. 🎓 Student Experience
Navigate to **Student Portal**:
- **Select Food Items**:
  - Categorized menu: *All Items, 🍔 Burgers, 🍛 Rice Bowls, 🍟 Snacks, 🥤 Beverages*.
  - Dietary filters: **🟢 Veg Only** and **🔴 Non-Veg**.
  - Search bar with instant filtering.
  - Pricing, star ratings, calorie info, and preparation times (e.g. 2–5 mins).
- **Place Order**:
  - Interactive tray slide-out cart drawer with quantity adjustments and custom kitchen prep notes.
  - Subtotal calculation and real-time wait estimate.
- **Digital Queue Number & Live Position Tracking**:
  - Instant digital ticket generation (e.g., **Ticket #Q-12**, Token #T-1042-ALEX).
  - **Live Stepper Visualizer**:
    $$\mathbf{\#12} \longrightarrow \mathbf{\#8} \longrightarrow \mathbf{\#4} \longrightarrow \mathbf{Ready!}$$
  - **Estimated Pickup Time**: Dynamic clock time (e.g., *"Ready by 1:08 PM (~8 min)"*).
  - **"⏩ Advance Position" button**: Click to immediately test the live queue progression from #12 to #8 to #4 to Ready!
- **Digital Pick-up Pass (QR Code)**:
  - Dynamically generated scannable QR code containing student token, name, and ticket number for rapid counter verification.

---

### 4. 🤖 AI Predictive Features
- **Queue Length Prediction using Previous Order Data**:
  - Interactive **Chart.js** curve showing recorded hourly averages vs. AI projected queue lengths across the full operating day (9:00 AM to 5:00 PM).
- **Predicts Busy Periods**:
  - Automated detection of meal rushes and lull periods.
  - Quietest window identified: `11:15 AM - 11:45 AM` and `2:45 PM - 3:30 PM` (< 3 mins wait).
- **Suggests the Best Time to Order**:
  - AI Smart Advice: Recommends ordering before rush or waiting for optimal slots (e.g. `1:45 PM - 2:15 PM` to save ~14 minutes).
- **Alerts Staff when Queue is Too Long**:
  - Dynamic surge banner triggers when queue exceeds 15 students:
    > 🔴 **HIGH CONGESTION ALERT**: Queue threshold exceeded: 18 students waiting (>15 limit). Estimated wait time has reached 12 mins.
    > *AI Recommendation: Open Counter #2 (Beverages & Express Packs) and pre-package Cheeseburgers.*
- **AI Prediction Banner**:
  - Highlighted across Staff and Home views: **“Peak expected at 1:00 PM (~35 students)”**.

---

### 5. 👨‍🍳 Staff Operations Dashboard
Navigate to **Staff Dashboard**:
- **Live Orders Kanban Board**:
  - **Pending Orders**: Tickets waiting in line with order timestamp and student name.
  - **Preparing**: Items currently cooking on the grill/counter.
  - **Ready for Pickup**: Student receives ready notification and chime; QR code is ready for scanning.
  - **Completed Orders**: Archive log of served orders.
- **Action Controls**:
  - **📢 Call Next Ticket**: Automatically advances pending orders to the prep station.
  - **⚡ Test Rush (+5 Stds)**: Simulates a burst of 5 students joining the queue to test AI alert triggers.
  - **🔄 Reset Data**: Restores default prototype parameters (18 students, 12 min wait).
- **Queue Length Graph**: Embedded real-time visualization of queue trends.

---

## 🛠️ Tech Stack & Implementation Details

- **HTML5 & Vanilla JavaScript (ES6+)**: Clean, component-driven, framework-free architecture.
- **Tailwind CSS (via CDN)**: Modern responsive design with custom glassmorphism, animated glow effects, and pulse status indicators.
- **Chart.js**: Smooth line & gradient fill queue prediction graphs.
- **QRCode.js + SVG Fallback**: High-reliability dual-engine QR code rendering.
- **BroadcastChannel & Storage API**: Inter-tab state synchronization for realistic multi-device demoing.
- **Web Audio API**: Synthetic audio chimes for student notifications and staff surge alerts without external MP3 dependencies.
