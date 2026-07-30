### 📜 License Change
- **TimbrApp Extension is now licensed under GPL-3.0** (previously MIT). See the updated [LICENSE](LICENSE) and the new [NOTICE](NOTICE) file for details.

### ✨ New Features
- **Snooze Reminders:** you can now snooze a clock-in/out reminder instead of dismissing it outright, from both the on-page banner and the system notification, with a configurable duration (5/10/15/30 minutes, default 5) in the options page. If a snoozed reminder is never resolved, it automatically stops repeating after 24 hours and never overlaps with the next scheduled reminder.
- **Enable/Disable Reminders with One Click:** the status indicator in the options page is now clickable — turn reminders on or off instantly without clearing your saved times.

### 🚀 Improvements
- **Refreshed Options Page Layout:** improved the visual design of the settings page — clearer grouping of the header controls, morning/afternoon schedule side by side, and better use of screen space overall.
- **Visual Guide:** added a bilingual (EN/IT) screenshots guide, linked from the README, showing the reminder notification and the options page in action.
- **Self-Contained Welcome Page:** the extension's welcome page (`README.html`) is now generated automatically at release time from `README.md`, with all styling embedded inline. It no longer loads any stylesheet from an external CDN when opened.
- Updated GitHub Actions dependencies used by the release pipeline (`actions/checkout` to v4, `softprops/action-gh-release` to v2).
- **Automated Linting:** added a separate, lightweight CI check that lints the code on every push and pull request, catching syntax/style issues early instead of at release time.
- **Supply-Chain Hardening:** the release pipeline now verifies the SHA256 checksum of the downloaded `minify` binary before using it to build the package.

### 🐛 Bug Fixes
- **Fixed a bug** where clearing all Chrome alarms when no schedule was configured would also silently remove the internal health-check alarm, instead of only clearing the main notification alarm.
- **Fixed a bug** in the options page where settings were read from storage without properly waiting for the operation to complete, which could cause the form to be populated with stale or incomplete data right after saving.
- **Fixed a bug** where the "Go to site" action could try to open an invalid or malformed URL; it now only opens the tab if the saved URL starts with `http://` or `https://`.
- **Fixed a timing issue** where the on-page overlay injection into browser tabs was not properly awaited, which could cause it to run out of order with other cleanup operations.

### 🛠️ Minor Fixes
- **More Reliable Release Packaging:** replaced the fragile text-substitution previously used to distinguish debug and release builds with a check based on the extension's own version metadata, removing a source of possible silent failures at release time. Developers loading the extension unpacked will now see a "DEV" badge on the options page.
- Removed a duplicated debug log line and a stray incomplete comment in the alarm-handling logic.
- Removed unused, commented-out code in the options page cleanup handler.

---

Download the zip file below, extract it, and load the extension in *developer mode* on Chrome/Edge.
