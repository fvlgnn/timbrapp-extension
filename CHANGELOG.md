### 🚀 Improvements
- **Complete Overhaul of the Alarm System:** The internal alarm scheduling logic has been completely rewritten for significantly improved reliability and robustness. The extension now uses a single, precise alarm instead of multiple periodic ones, preventing issues after the computer wakes from sleep or hibernation.
- **Smart Handling of Long Inactivity:** If the computer has been inactive for more than 24 hours (e.g., after a long weekend), the extension will now show a generic "Missed Clock-ins" notification instead of an outdated specific one.

### 🐛 Bug Fixes
- **Resolved an issue** where alarms would not trigger correctly if they were scheduled to fire while the computer was in hibernation.

---

Download the `timbrapp-extension.zip` file below, extract it, and load the extension in *developer mode* on Chrome/Edge.
