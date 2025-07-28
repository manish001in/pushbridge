# Pushbridge (Unofficial)

A Manifest V3 compatible Chrome extension that replicates core Pushbullet functionality via the official Pushbullet REST & WebSocket APIs.

**This is an unofficial extension and is not affiliated with or endorsed by Pushbullet Inc. Use at your own risk.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Features

- **📱 Notification Mirroring**: Mirror Android notifications to your desktop
- **📤 Push Sending**: Send notes, links, and files to your devices
- **💬 SMS/MMS Support**: Send and receive SMS messages from your desktop
- **📢 Channel Subscriptions**: Subscribe to and broadcast to Pushbullet channels
- **🔄 Real-time Sync**: Instant synchronization via WebSocket connection
- **⚙️ Customizable Settings**: Configure notifications, sounds, and defaults

## 📋 Requirements

- Chrome 110 or higher
- Pushbullet account with Access Token
- Android device with Pushbullet app (for SMS/notification mirroring)

## 🔧 Installation

### From Release Packages (Recommended)

1. Download the latest release package from the [Releases page](https://github.com/manish001in/pushbridge/releases)
2. Extract the contents
3. Load the extension in Chrome Developer Mode
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the unzipped release package folder

### Manual Installation (Development)

1. Clone this repository:

   ```bash
   git clone https://github.com/manish001in/pushbridge.git
   cd pushbridge
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the extension:

   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## 🔑 Setup

### 1. Get Your Pushbullet Access Token

1. Go to [Pushbullet Settings](https://www.pushbullet.com/#settings/account)
2. Scroll down to "Create Access Token"
3. Click "Create Access Token"
4. Copy the generated token

### 2. Configure the Extension

1. Click the Pushbridge icon in your Chrome toolbar
2. Paste your Access Token in the setup field
3. Click "Save" to validate and store the token
4. The extension will automatically register your Chrome browser as a device

## 📖 Usage

### Sending Pushes

1. **Notes**: Send text notes to your devices
2. **Links**: Share web pages with titles and descriptions
3. **Files**: Drag and drop files to send them to your devices
4. **Broadcasts**: Send messages to your channel subscribers (if you own channels)

### Receiving Notifications

- Android notifications automatically appear as Chrome notifications
- Click notifications to dismiss them on your phone
- View recent pushes in the "Recent Pushes" tab

### SMS Messaging

1. Switch to the "Messages" tab
2. Select a conversation from the list
3. Type and send messages using your phone's number
4. Receive incoming SMS messages in real-time
5. Update the default SMS device in the options page

### Channel Management

1. Go to the "Channels" tab
2. Search for channels by tag
3. Subscribe to channels to receive their posts
4. Manage your subscriptions with unsubscribe options

### Context Menu Actions

Right-click on any webpage to:

- Push the current page to your devices
- Push selected text as a note
- Push images to your devices

## ⚙️ Settings

Access settings by right-clicking the extension icon and selecting "Options":

- **Notifications**: Toggle notification sounds and display
- **Default Device**: Choose which device receives pushes by default
- **Connection**: Test WebSocket connection and auto-reconnect settings
- **Diagnostics**: Export debug logs for troubleshooting
- **SMS Device**: Choose default SMS device for SMS functionality

## 🛠️ Development

### Project Structure

```
pushbridge/
├── src/
│   ├── background/     # Service worker and background logic
│   ├── popup/         # Popup UI components
│   ├── options/       # Options page
│   ├── content/       # Content scripts
│   └── types/         # TypeScript type definitions
├── public/            # Static assets and manifest
├── tests/             # Unit and E2E tests
└── dist/              # Built extension files
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run unit tests
npm run test:e2e     # Run E2E tests
npm run lint         # Run ESLint
npm run format       # Format code with Prettier

# Production
npm run build --prod   # Build optimized production bundle
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

## 🔒 Privacy & Security

- **No Data Storage**: All data is stored locally in Chrome storage
- **Direct API Access**: Communicates directly with Pushbullet APIs
- **No Third-party Servers**: No data passes through our servers
- **Open Source**: Full transparency with MIT license

## 🐛 Troubleshooting

### Common Issues

**"Invalid token" error**

- Verify your token is correct and not expired
- Check that you copied the entire token
- Generate a new token if needed

**Notifications not appearing**

- Check Chrome notification permissions
- Verify the extension has notification access
- Test WebSocket connection in options

**SMS not working**

- Ensure your phone has Pushbullet app installed
- Check that SMS mirroring is enabled in Pushbullet app
- Verify your phone is connected to the internet
- Make sure the selected default SMS device is active and has SMS capability

**File uploads failing**

- Check file size (max 25MB for free tier)
- Verify internet connection
- Try smaller files first

### Getting Help

1. Check the [Issues page](https://github.com/manish001in/pushbridge/issues)
2. Export debug logs from the options page
3. Create a new issue with debug information

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This is an **unofficial** extension and is not affiliated with or endorsed by Pushbullet Inc. Use at your own risk.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 🙏 Acknowledgments

- [Pushbullet](https://pushbullet.com/) for their excellent API
- [Lit](https://lit.dev/) for the web component framework

---

**Made with ❤️ by manish001in**
