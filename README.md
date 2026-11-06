# Pushbridge (Unofficial)

A Manifest V3 compatible Chrome extension that replicates core Pushbullet functionality via the official Pushbullet REST & WebSocket APIs.

**This is an unofficial extension and is not affiliated with or endorsed by Pushbullet Inc. Use at your own risk.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Features

- **📱 Notification Mirroring**: Mirror Android notifications to your desktop
- **📤 Push Sending**: Send notes, links, and files to your devices
- **🔔 Live Push Notifications**: Desktop notifications for incoming pushes, including ones that arrived while your computer was asleep
- **💬 SMS/MMS Support**: Send and receive SMS messages from your desktop
- **📢 Channel Subscriptions**: Subscribe to and broadcast to Pushbullet channels
- **🔄 Real-time Sync**: Instant synchronization via WebSocket connection
- **⚙️ Customizable Settings**: Configure notifications, sounds, defaults, tab order and theme
- **🔍 Contacts Management**: Send pushes to contacts

## 📋 Requirements

- Chrome 116 or higher
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
5. **Contacts**: Send pushes to contacts

### Receiving Notifications

- Android notifications automatically appear as Chrome notifications
- Click notifications to dismiss them on your phone
- Pushes sent to this browser show as desktop notifications. After time away, up to 10 show, plus one summary of the rest
- View recent pushes in the "Messages" tab, under "Own Devices & Contacts" or "Channels & Subs". Posts from channels you subscribe to appear in the "Subscriptions" tab

### Opening Links

- Clicking a link in the popup opens it and closes the popup
- Cmd+click (macOS), Ctrl+click (Windows/Linux) or middle click opens it in a background tab and keeps the popup open

### SMS Messaging

1. Switch to the "SMS/MMS" tab
2. Select a conversation from the list
3. Type and send messages using your phone's number
4. Receive incoming SMS messages in real-time
5. Update the default SMS device in the options page

### Channel Management

1. Go to the "Subscriptions" tab
2. Search for channels by tag
3. Subscribe to channels to receive their posts
4. Manage your subscriptions with unsubscribe options

### Context Menu Actions

Right-click on any webpage to:

- Push the current page to your devices or contacts
- Push selected text as a note to your devices or contacts
- Push images to your devices or contacts

## ⚙️ Settings

Access settings by right-clicking the extension icon and selecting "Options":

- **Notifications**: Toggle notifications, sounds and mirrored notifications separately, and auto-dismiss them
- **Tabs**: Reorder or hide the popup's tabs
- **Theme**: Match your system's light or dark theme
- **Default Device**: Choose which device receives pushes by default
- **Connection**: Test WebSocket connection and auto-reconnect settings
- **Diagnostics**: Export debug logs for troubleshooting
- **SMS Device**: Choose default SMS device for SMS functionality
- **Auto Open Push Links as Tabs**: Automatically open link pushes in new browser tabs when received
- **Reset All Data**: Clears everything and restarts the extension

## 💡 Good to Know

- **Rate limits**: Pushbullet limits how much each account can do. If you reach the limit, a push you send is saved and goes out automatically. A file or SMS fails straight away and keeps what you wrote, so nothing goes out later without you knowing
- **Offline**: A note or link sent with no connection is saved and goes out when you're back online. Files need a connection
- **Switching accounts**: Signing in as a different account restarts the extension, so nothing from the old account carries over except general preferences. Open Pushbridge windows close, and it reopens by itself. Signing back in as the same account keeps everything
- **Two phones**: Two phones with matching notification IDs clear together when one is dismissed, because Pushbullet's dismissal doesn't say which device it came from
- **SMS status**: A sent text shows as sent. There's no tracking of whether the phone delivered it

## 🛠️ Development

### Project Structure

```
pushbridge/
├── src/
│   ├── background/     # Service worker and background logic
│   ├── popup/         # Popup UI components
│   ├── options/       # Options page
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
npm run test:e2e     # Run the smoke test
npm run lint         # Run ESLint
npm run format       # Format code with Prettier

# Production
npm run build --prod   # Build optimized production bundle
```

### Testing

Run `npm run build` before the browser tests. Set `PUPPETEER_EXECUTABLE_PATH` if needed.

```bash
# Unit tests
npm test

# Browser tests against the built extension
npm run test:e2e
npm run test:e2e:tabs
npm run test:e2e:send-safety
npm run test:e2e:popup-links
npm run test:e2e:theme-window

# Real extension against a local fake Pushbullet API and stream
npm run test:e2e:fake-api
```

The theme/window browser regression test loads the built, unpacked extension in
Chrome for Testing with disposable cached data and blocked Pushbullet requests:

```bash
npm run build
npm run test:e2e:theme-window
```

Use a current Chrome for Testing (Chrome 127+ for the test's `action.openPopup`
automation). If Puppeteer's bundled browser is not installed, set
`PUPPETEER_EXECUTABLE_PATH` to your Chrome for Testing executable. This exercises
real Chrome storage/window APIs, not live Pushbullet delivery.

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
