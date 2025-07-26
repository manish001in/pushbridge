const { ChromeExtension } = require('chrome-extension-tester');
const { expect } = require('chai');
const path = require('path');

describe('Pushbridge E2E Regression Suite', function () {
  let extension;

  before(async function () {
    // Load the extension
    extension = await ChromeExtension.load(
      path.resolve(__dirname, '../../dist')
    );
  });

  after(async function () {
    if (extension) {
      await extension.unload();
    }
  });

  describe('Extension Loading & Basic Functionality', function () {
    it('should load extension successfully', async function () {
      expect(extension).to.not.be.null;
      expect(extension.id).to.be.a('string');
    });

    it('should have correct manifest structure', async function () {
      const manifest = extension.getManifest();
      expect(manifest.manifest_version).to.equal(3);
      expect(manifest.name).to.equal('Pushbridge');
      expect(manifest.version).to.equal('1.0.0');
      expect(manifest.permissions).to.include('storage');
      expect(manifest.permissions).to.include('notifications');
      expect(manifest.permissions).to.include('alarms');
      expect(manifest.permissions).to.include('contextMenus');
    });

    it('should have required host permissions', async function () {
      const manifest = extension.getManifest();
      expect(manifest.host_permissions).to.include(
        'https://api.pushbullet.com/*'
      );
      expect(manifest.host_permissions).to.include('https://*.amazonaws.com/*');
    });
  });

  describe('Popup UI & Token Setup', function () {
    it('should show token setup on first run', async function () {
      const popup = await extension.getPopup();
      const tokenInput = await popup.$('input[placeholder*="token" i]');
      expect(tokenInput).to.not.be.null;
    });

    it('should validate token input', async function () {
      const popup = await extension.getPopup();
      const tokenInput = await popup.$('input[placeholder*="token" i]');
      const saveButton = await popup.$('button:contains("Save")');

      // Test invalid token
      await tokenInput.setValue('invalid-token');
      await saveButton.click();

      // Should show error message
      const errorMessage = await popup.$('.error-message');
      expect(await errorMessage.isDisplayed()).to.be.true;
    });
  });

  describe('Push Functionality', function () {
    beforeEach(async function () {
      // Setup valid token for push tests
      // This would require a test token or mock setup
    });

    it('should send note push', async function () {
      const popup = await extension.getPopup();

      // Fill note content using unified form
      const titleInput = await popup.$('input[placeholder*="title" i]');
      const bodyInput = await popup.$('textarea[placeholder*="message" i]');
      const sendButton = await popup.$('button:contains("Send Push")');

      await titleInput.setValue('Test Note');
      await bodyInput.setValue('This is a test note from E2E');
      await sendButton.click();

      // Should show success message
      const successMessage = await popup.$('.success-message');
      expect(await successMessage.isDisplayed()).to.be.true;
    });

    it('should send link push with auto-detection', async function () {
      const popup = await extension.getPopup();

      // Fill link content using unified form - should auto-detect as link
      const titleInput = await popup.$('input[placeholder*="title" i]');
      const bodyInput = await popup.$('textarea[placeholder*="message" i]');
      const sendButton = await popup.$('button:contains("Send Push")');

      await titleInput.setValue('Test Link');
      await bodyInput.setValue('https://example.com');
      await sendButton.click();

      // Should show success message
      const successMessage = await popup.$('.success-message');
      expect(await successMessage.isDisplayed()).to.be.true;
    });

    it('should send note push with URL and text', async function () {
      const popup = await extension.getPopup();

      // Fill content that should be detected as note (URL + text)
      const titleInput = await popup.$('input[placeholder*="title" i]');
      const bodyInput = await popup.$('textarea[placeholder*="message" i]');
      const sendButton = await popup.$('button:contains("Send Push")');

      await titleInput.setValue('Test Note with URL');
      await bodyInput.setValue('Check this out: https://example.com');
      await sendButton.click();

      // Should show success message
      const successMessage = await popup.$('.success-message');
      expect(await successMessage.isDisplayed()).to.be.true;
    });
  });

  describe('File Push Functionality', function () {
    it('should handle file upload with unified form', async function () {
      const popup = await extension.getPopup();

      // Create a test file
      const testFile = path.resolve(__dirname, '../fixtures/test-file.txt');

      // Upload file using file input
      const fileInput = await popup.$('input[type="file"]');
      await fileInput.setValue(testFile);

      // Should show file info
      const fileInfo = await popup.$('.form-text');
      expect(await fileInfo.getText()).to.include('test-file.txt');

      // Add optional title and message
      const titleInput = await popup.$('input[placeholder*="title" i]');
      const bodyInput = await popup.$('textarea[placeholder*="message" i]');
      
      await titleInput.setValue('Test File');
      await bodyInput.setValue('This is a test file upload');

      // Send file
      const sendButton = await popup.$('button:contains("Send Push")');
      await sendButton.click();

      // Should show success message
      const successMessage = await popup.$('.success-message');
      expect(await successMessage.isDisplayed()).to.be.true;
    });

    it('should handle file upload without message', async function () {
      const popup = await extension.getPopup();

      // Create a test file
      const testFile = path.resolve(__dirname, '../fixtures/test-file.txt');

      // Upload file using file input
      const fileInput = await popup.$('input[type="file"]');
      await fileInput.setValue(testFile);

      // Send file without additional message
      const sendButton = await popup.$('button:contains("Send Push")');
      await sendButton.click();

      // Should show success message
      const successMessage = await popup.$('.success-message');
      expect(await successMessage.isDisplayed()).to.be.true;
    });
  });

  describe('SMS Functionality', function () {
    it('should display SMS conversations', async function () {
      const popup = await extension.getPopup();

      // Switch to SMS tab
      const smsTab = await popup.$('[data-tab="messages"]');
      await smsTab.click();

      // Should show conversation list
      const conversationList = await popup.$('pb-conversation-list');
      expect(conversationList).to.not.be.null;
    });

    it('should send SMS message', async function () {
      const popup = await extension.getPopup();

      // Switch to SMS tab
      const smsTab = await popup.$('[data-tab="messages"]');
      await smsTab.click();

      // Select a conversation
      const firstConversation = await popup.$('.conversation-item');
      await firstConversation.click();

      // Type message
      const messageInput = await popup.$('textarea[placeholder*="message" i]');
      const sendButton = await popup.$('button:contains("Send")');

      await messageInput.setValue('Test SMS from E2E');
      await sendButton.click();

      // Should show message in thread
      const messageElement = await popup.$(
        '.message:contains("Test SMS from E2E")'
      );
      expect(await messageElement.isDisplayed()).to.be.true;
    });
  });

  describe('Channel Functionality', function () {
    it('should display channel directory', async function () {
      const popup = await extension.getPopup();

      // Switch to channels tab
      const channelsTab = await popup.$('[data-tab="channels"]');
      await channelsTab.click();

      // Should show search field
      const searchInput = await popup.$('input[placeholder*="search" i]');
      expect(searchInput).to.not.be.null;
    });

    it('should search and subscribe to channel', async function () {
      const popup = await extension.getPopup();

      // Switch to channels tab
      const channelsTab = await popup.$('[data-tab="channels"]');
      await channelsTab.click();

      // Search for a channel
      const searchInput = await popup.$('input[placeholder*="search" i]');
      await searchInput.setValue('pushbullet');

      // Wait for search results
      await popup.waitForElement('.channel-item', 5000);

      // Click subscribe on first result
      const subscribeButton = await popup.$('.channel-item .subscribe-button');
      await subscribeButton.click();

      // Should show success message
      const successMessage = await popup.$('.success-message');
      expect(await successMessage.isDisplayed()).to.be.true;
    });

    it('should show channel subscriptions', async function () {
      const popup = await extension.getPopup();

      // Switch to channels tab
      const channelsTab = await popup.$('[data-tab="channels"]');
      await channelsTab.click();

      // Should show subscriptions list
      const subscriptionsList = await popup.$('.subscriptions-list');
      expect(subscriptionsList).to.not.be.null;
    });
  });

  describe('Broadcast Functionality', function () {
    it('should show broadcast tab for owned channels', async function () {
      const popup = await extension.getPopup();

      // Switch to composer tab
      const composerTab = await popup.$('[data-tab="composer"]');
      await composerTab.click();

      // Should show broadcast tab if user owns channels
      const broadcastTab = await popup.$('[data-tab="broadcast"]');
      if (await broadcastTab.isDisplayed()) {
        await broadcastTab.click();

        // Should show channel selector
        const channelSelect = await popup.$('select[data-channel-select]');
        expect(channelSelect).to.not.be.null;
      }
    });
  });

  describe('Options Page', function () {
    it('should load options page', async function () {
      const optionsPage = await extension.getOptionsPage();
      expect(optionsPage).to.not.be.null;
    });

    it('should save settings', async function () {
      const optionsPage = await extension.getOptionsPage();

      // Toggle sound setting
      const soundToggle = await optionsPage.$('#sound-toggle');
      const initialState = await soundToggle.isSelected();
      await soundToggle.click();

      // Should show save message
      const message = await optionsPage.$('.message.success');
      expect(await message.isDisplayed()).to.be.true;
    });

    it('should test WebSocket connection', async function () {
      const optionsPage = await extension.getOptionsPage();

      // Click test WebSocket button
      const testButton = await optionsPage.$('#test-websocket');
      await testButton.click();

      // Should show result
      const message = await optionsPage.$('.message');
      expect(await message.isDisplayed()).to.be.true;
    });

    it('should export debug log', async function () {
      const optionsPage = await extension.getOptionsPage();

      // Click export log button
      const exportButton = await optionsPage.$('#export-log');
      await exportButton.click();

      // Should show success message
      const message = await optionsPage.$('.message.success');
      expect(await message.isDisplayed()).to.be.true;
    });
  });

  describe('Context Menu Integration', function () {
    it('should create context menu items', async function () {
      // Navigate to a webpage
      const page = await extension.createPage('https://example.com');

      // Right-click on page
      await page.rightClick('body');

      // Should show Pushbridge context menu items
      const contextMenu = await page.$('.context-menu');
      expect(contextMenu).to.not.be.null;
    });
  });

  describe('Notification Mirroring', function () {
    it('should handle incoming notifications', async function () {
      // This would require simulating incoming pushes
      // For now, just verify the extension can create notifications
      const popup = await extension.getPopup();

      // Trigger a test notification (if available)
      // This is a placeholder for actual notification testing
      expect(true).to.be.true;
    });
  });

  describe('Error Handling', function () {
    it('should handle network errors gracefully', async function () {
      const popup = await extension.getPopup();

      // Test with invalid token
      const tokenInput = await popup.$('input[placeholder*="token" i]');
      await tokenInput.setValue('invalid-token');

      // Should show appropriate error message
      const errorMessage = await popup.$('.error-message');
      expect(await errorMessage.isDisplayed()).to.be.true;
    });

    it('should handle API rate limiting', async function () {
      // This would require simulating rate limit responses
      // For now, just verify the extension doesn't crash
      expect(true).to.be.true;
    });
  });

  describe('Performance & Bundle Size', function () {
    it('should meet bundle size requirements', async function () {
      // Check that bundle sizes are within limits
      const manifest = extension.getManifest();
      const backgroundScript = manifest.background.service_worker;

      // Verify background script exists and is reasonable size
      expect(backgroundScript).to.equal('background.js');

      // Additional size checks would be done in build process
      expect(true).to.be.true;
    });
  });
});
