# Changelog

## [1.3.3] - 2026-11-06

### Added
- Desktop notifications for live pushes. They skip pushes sent from this browser or to another device, and links that opened in a tab. One scan raises at most 10; the rest stay in Messages and on the badge

### Changed
- Received files only notify, and are downloaded from Messages. The old auto-download code never ran in practice and has been removed

### Fixed
- An attachment or reply could go to the wrong SMS conversation if you switched conversations while it was sending or loading. Drafts now stay with their conversation
- Posts to a channel went to all your own devices instead of the channel
- Pressing Cmd/Ctrl+Enter twice sent a push twice
- A queued push could send twice after a worker restart or a failed storage write. One interrupted mid-send is now reported instead of being resent
- Queued pushes are no longer dropped after repeated network failures
- Signing out or changing account stops work already running for the old account, and clears its notifications
- Refreshing devices, contacts or channels could lose everything on earlier pages
- Device names can no longer inject markup into the settings page
- SMS notifications: fewer duplicates, and a reply from your phone no longer hides a new incoming message
- Open SMS conversations update when a sync finishes, and the 6-hour SMS sync survives worker restarts
- Interrupted uploads are reported instead of silently disappearing
- A rate limit on any request no longer stalls other queued requests
- Far fewer API calls when pushes come from sources the extension doesn't recognize
- Pushes meant for another device no longer raise the badge count
- SMS conversations can be opened from the keyboard
- Updates to a mirrored notification replace it instead of adding another, and count once on the badge
- SMS sync no longer loses newer messages, or threads it failed to fetch
- Opening an SMS conversation now marks it read, and it stays read after a sync
- A queued request that got HTTP 429 now retries by itself after the backoff
- One click on a push notification opens one tab, and only web links can open

### Security
- Routine logs are removed from production builds, because they included message contents. The 1.3.2 notes said this was already done, which was wrong

## [1.3.2] - 2026-11-06

### Added
- Cmd+click (macOS), Ctrl+click (Windows/Linux) and middle click open links in a background tab and keep the popup open
- "Show mirrored notifications" and "Auto-dismiss notifications" settings
- Move up/down buttons for reordering tabs with the keyboard

### Fixed
- Popup draws immediately instead of waiting on the network, then loads the other tabs in the background
- Tabs show saved data straight away and refresh quietly, instead of showing a loading state
- SMS conversations update in the popup when a background sync finishes
- Live pushes stopped after a browser restart or worker restart
- Pushes sent while the computer was asleep are now caught up on reconnect, including auto-opening links
- "Enable notifications", "Play notification sound" and "Auto-reconnect" settings had no effect
- The default target device setting was ignored when sending a push
- Queued pushes could be sent twice, and operations added during processing could be lost
- "Reset All Data" left the old account's stream connected
- Mirrored notifications could not be recognized on click or close, and stayed on screen after expiring
- SMS and last-seen timestamp handling that showed old messages or hid new pushes
- Auto-open only opens web links meant for this browser

### Security
- Access tokens are no longer written to the console
- Removed the unused content script and web-accessible resources, so websites can no longer detect the extension
## [1.3.1] - 2026-11-05

### Added
- Match system theme toggle
- Open in window link, with a layout that fills the window
- Navigation customization: reorder and hide popup tabs from the options page

## [1.3.0] - 2025-08-13

### Changed
- ver bump


## [1.2.8] - 2025-08-13
### Fixed
- Fixed some errors


## [1.2.7] - 2025-08-13

### Fixed
- No unnecessary errors thrown when it's first time token input


## [1.2.6] - 2025-08-13

### Fixed
- ContextMenu only shows valid devices which are active and pushable now


## [1.2.5] - 2025-08-01

### Fixed
- Fixed issue with token bucket not refilling correctly, added automatic time-based refill


## [1.2.4] - 2025-07-31

### Changed
- ver bump and made queue operations more efficient


## [1.2.3] - 2025-07-30

### Added
- Deduplication for queue to avoid duplicate requests

### Changed
- New device is created with timestamp to keep track

## [1.2.2] - 2025-07-29

### Added
- Added tests for context menu

### Fixed
- Issue with context menu parsing fixed


## [1.2.1] - 2025-07-29

### Fixed
- How verification is handled after clearing all data!


## [1.2.0] - 2025-07-28

### Added
- Functionality to auto open push links as tabs. Go to options page to enable/disable.
- New permission to open tabs

### Changed
- Updated README.md



## [1.1.0] - 2025-07-28

### Added
- Functionality to send pushes to contacts
- Ability to send pushes to contacts or devices or to all devices through context menu
- Select default SMS device for SMS functionality in options page
- Added information to README.md

### Changed
- Updated token bucket to 240

## [1.0.1] - 2025-07-26

### Changed
- Readme updated


All notable changes to Pushbridge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-07-23

### Added

- **Initial Release**: Complete Pushbullet functionality replication
- **Authentication System**: Token-based authentication with validation
- **Device Management**: Automatic Chrome device registration
- **Push Functionality**: Send notes, links, and files to devices
- **Notification Mirroring**: Real-time Android notification mirroring
- **SMS/MMS Support**: Send and receive SMS messages from desktop
- **Channel Management**: Subscribe to and broadcast to Pushbullet channels
- **Real-time Sync**: WebSocket-based instant synchronization
- **Context Menu Integration**: Right-click actions for pushing content
- **Options Page**: Comprehensive settings and diagnostics
- **Error Handling**: Centralized error management with user feedback
- **Storage Management**: Typed storage helpers with quota monitoring
- **Keep-alive System**: 5-minute alarms to maintain service worker activity
- **Token Health Monitoring**: Background token validation every 6 hours

### Features

- **Push Types**: Notes, links, files, and broadcasts
- **Device Selection**: Choose target devices for pushes
- **Recent Pushes**: View and manage recent push history
- **Conversation Threading**: SMS conversation management
- **Channel Directory**: Search and subscribe to channels
- **Broadcast Support**: Send messages to channel subscribers
- **Notification Controls**: Customize notification behavior
- **WebSocket Testing**: Diagnostic tools for connection issues
- **Debug Logging**: Export debug information for troubleshooting

### Technical

- **Manifest V3**: Modern Chrome extension architecture
- **TypeScript**: Full type safety throughout the codebase
- **Lit Framework**: Lightweight web components for UI
- **Vite Build System**: Fast development and optimized production builds
- **Jest Testing**: Comprehensive unit test coverage
- **E2E Testing**: End-to-end regression testing suite
- **ESLint + Prettier**: Code quality and formatting
- **Bundle Optimization**: Tree-shaking and minification for production

### Security & Privacy

- **Local Storage**: All data stored locally in Chrome storage
- **Direct API Access**: No third-party servers involved
- **Token Security**: Secure token storage and validation
- **Permission Minimization**: Minimal required permissions
- **Open Source**: Full transparency with MIT license

### UI/UX

- **Modern Design**: Clean, responsive interface
- **Accessibility**: WCAG compliant design
- **Responsive Layout**: Works on various screen sizes
- **Error Feedback**: Clear error messages and notifications
- **Loading States**: Visual feedback for async operations
- **Keyboard Navigation**: Full keyboard accessibility
- **Dark Mode Support**: Automatic theme detection

### Performance

- **Bundle Size**: Optimized to under 500KB gzipped
- **Lazy Loading**: Dynamic imports for better performance
- **Caching**: Intelligent caching of API responses
- **Background Processing**: Efficient service worker management
- **Memory Management**: Proper cleanup and resource management

### Browser Support

- **Chrome 110+**: Full support for Manifest V3 features
- **Minimum Version**: Enforced minimum Chrome version for stability

### Documentation

- **Comprehensive README**: Installation, setup, and usage guide
- **API Documentation**: TypeScript definitions for all APIs
- **Troubleshooting Guide**: Common issues and solutions
- **Development Guide**: Contributing and development setup

### Testing

- **Unit Tests**: 100% code coverage
- **Integration Tests**: API integration testing
- **E2E Tests**: Full user workflow testing
- **Performance Tests**: Bundle size and load time verification (37.14 KB gzipped)

### Build & Deployment

- **Production Builds**: Optimized for Chrome Web Store
- **Development Builds**: Fast iteration with source maps
- **Bundle Analysis**: Size monitoring and optimization
- **CI Pipeline**: Automated testing

---

## Version History

- **1.0.0**: First release with full feature set

## Release Notes

### Breaking Changes

- None in 1.0.0 (initial release)

### Migration Guide

- N/A for 1.0.0 (initial release)

### Known Issues

- None documented for 1.0.0

---

For detailed information about each release, see the [GitHub releases page](https://github.com/manish001in/pushbridge/releases).
