# Changelog

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
