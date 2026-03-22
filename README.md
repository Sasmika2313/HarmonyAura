# Harmony Aura 🌟

**Harmony Aura** is an advanced site simulation and monitoring ecosystem designed to harmonize the relationship between human workers and industrial machines. It provides real-time visibility into operational health, safety statuses, and machine efficiency across multi-platform interfaces.

## 🚀 Key Features

- **Real-time Monitoring**: Track "Humans" and "Machines" statuses (Critical vs. Okay) in real-time.
- **Multi-platform Support**:
  - **Web Dashboard**: High-level overview and administrative control.
  - **Mobile App**: On-the-go monitoring for site managers and workers.
- **Dynamic UI**: Modern, responsive design with full support for Dark and Light modes.
- **Data-Driven Insights**: Backend powered by AI/Data analysis to predict and maintain operational harmony.
- **Firebase Integration**: Real-time data synchronization and secure management.

---

## 🏗️ Project Structure

The repository is organized into three main components:

- `/HarmonyAuraApp`: **Mobile Application** built with Expo (React Native).
- `/harmony_backend`: **FastAPI Backend** handling data processing and Firebase integration.
- `/src` & root: **Web Dashboard** powered by React, TypeScript, and Vite.

---

## 🛠️ Tech Stack

### Frontend & Dashboard
- **Framework**: React 18+
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Vanilla CSS (Custom Variable System)

### Mobile App
- **Framework**: Expo / React Native
- **Navigation**: Expo Router & React Navigation
- **Animations**: React Native Reanimated
- **Icons**: Expo Vector Icons

### Backend
- **Framework**: FastAPI (Python)
- **Database/Real-time**: Firebase Admin SDK
- **Data Processing**: NumPy
- **Server**: Uvicorn

---

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- Expo Go (for mobile testing)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Sasmika2313/HarmonyAura.git
   cd HarmonyAura
   ```

2. **Setup the Web Dashboard**:
   ```bash
   npm install
   npm run dev
   ```

3. **Setup the Backend**:
   ```bash
   cd harmony_backend
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

4. **Setup the Mobile App**:
   ```bash
   cd HarmonyAuraApp
   npm install
   npx expo start
   ```

---

## 📄 License

This project is private and for internal use only.

---

*Built with ❤️ for Harmony and Efficiency.*
