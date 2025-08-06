### 🚀 Improvements
- **Options Page UX**: The options page now opens in a dedicated new tab instead of within the `chrome://extensions` page, providing a cleaner and more spacious user interface for configuration.
- **Alarm Handling Overhaul**: Completely redesigned the alarm processing system to be more robust and reliable. The new system uses a persistent queue and a dedicated processing alarm to correctly handle all scenarios, including browser restarts and service worker suspensions.
- **Notification Replacement Logic**: Improved the user experience by ensuring that a new alarm notification will always replace any existing one. This guarantees the user always sees the most recent and relevant reminder.
- **Code Refactoring**: Renamed internal actions to be more descriptive of user intent, improving code clarity and maintainability.

### 🐛 Bug Fixes
- **Multiple Notification Bug**: Fixed a critical issue where multiple notifications would appear simultaneously if the browser was closed for an extended period. The extension now correctly displays only the single, most recent missed notification.
- **Incorrect Notification Text**: Fixed a bug where, after multiple missed alarms, the notification text would incorrectly default to a specific reminder. The system now displays a more appropriate generic alert in this scenario.
- **Overlay Banner Bug**: Fixed an issue where the alert banner could be displayed even when the feature was disabled ('None').

### ✨ New Features
- Nothing new.

---

Download the `timbrapp-extension.zip` file below, extract it, and load the extension in *developer mode* on Chrome/Edge.
