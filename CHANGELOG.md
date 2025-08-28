### 🚀 Improvements
- **Advanced Help System**: Replaced the basic tooltip on the help icon with an interactive pop-up panel. The new panel displays detailed usage instructions directly on the options page, improving user guidance.
- **Improved UI for Controls**: The "Help" and "Clear Times" icons in the options page header have been redesigned as distinct buttons with an improved style, making them more visible and intuitive to use.
- **Documentation Clarity**: The "Usage" section in the documentation has been restructured for better readability, providing clearer instructions on how to configure and use the extension.

### 🐛 Bug Fixes
- **Improved Notification Stability**: Reworked the alarm notification system to be significantly more reliable. The new approach uses a stable notification ID to atomically update alerts, eliminating race conditions that could prevent notifications from being displayed.
- **Enhanced Overlay Management for Stability and Performance**: Refactored the overlay removal process to be more efficient and reliable. It now tracks the specific tabs where overlays are active instead of querying all tabs, significantly improving performance.

### 🛠️ Minor Fixes
- **Improved badge initialization**: Now, if the alarm status value does not exist on installation, it is explicitly set to `false` to ensure consistent behavior and prevent potential issues with uninitialized state. If the value exists, it is read and the badge is set accordingly.

### ✨ New Features
- **Snooze Action on Overlay**: Added support for a "Snooze" action on the secondary button of the notification overlay. In a future update, users will be able to actually postpone alerts directly from the overlay, further improving flexibility in managing notifications.

---

Download the `timbrapp-extension.zip` file below, extract it, and load the extension in *developer mode* on Chrome/Edge.
