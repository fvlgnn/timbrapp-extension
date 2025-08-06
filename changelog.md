### 🚀 Improvements
- **Alarm Handling Overhaul**: Completely redesigned the alarm processing system to be more robust and reliable. The new system uses a persistent queue and a dedicated processing alarm to correctly handle all scenarios, including browser restarts and service worker suspensions.

### ✨ New Features
- Nothing new.

### 🐛 Bug Fixes
- **Multiple Notification Bug**: Fixed a critical issue where multiple notifications would appear simultaneously if the browser was closed for an extended period. The extension now correctly displays only the single, most recent missed notification.

---

Download the `timbrapp-extension.zip` file below, extract it, and load the extension in *developer mode* on Chrome/Edge.
