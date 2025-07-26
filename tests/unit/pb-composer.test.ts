// Test the push type detection logic without instantiating the LitElement component
describe('Push Type Detection Logic', () => {
  // Extract the determinePushType logic for testing
  const determinePushType = (
    message: string,
    file?: File
  ): 'note' | 'link' | 'file' => {
    if (file) return 'file';

    // Strip whitespace from message
    const trimmedMessage = message.trim();

    if (!trimmedMessage) return 'note';

    // Extract URLs from message using improved regex
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = trimmedMessage.match(urlRegex);

    // If exactly one URL and message is just that URL (after trimming), it's a link
    if (urls?.length === 1 && trimmedMessage === urls[0]) {
      return 'link';
    }

    // Otherwise it's a note (including multiple URLs or text with URLs)
    return 'note';
  };

  describe('Push Type Detection', () => {
    it('should detect file type when file is attached', () => {
      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });
      const result = determinePushType('some message', file);
      expect(result).toBe('file');
    });

    it('should detect link type when message contains exactly one URL', () => {
      const result = determinePushType('https://example.com');
      expect(result).toBe('link');
    });

    it('should detect link type when message contains exactly one URL with trailing spaces', () => {
      const result = determinePushType('  https://example.com  ');
      expect(result).toBe('link');
    });

    it('should detect note type when message contains multiple URLs', () => {
      const result = determinePushType(
        'https://example1.com and https://example2.com'
      );
      expect(result).toBe('note');
    });

    it('should detect note type when message contains URL with additional text', () => {
      const result = determinePushType('Check this out: https://example.com');
      expect(result).toBe('note');
    });

    it('should detect note type when message contains URL with text after', () => {
      const result = determinePushType('https://example.com - great site!');
      expect(result).toBe('note');
    });

    it('should detect note type when message is empty', () => {
      const result = determinePushType('');
      expect(result).toBe('note');
    });

    it('should detect note type when message is only whitespace', () => {
      const result = determinePushType('   ');
      expect(result).toBe('note');
    });

    it('should detect note type when message contains no URLs', () => {
      const result = determinePushType('Just a regular message');
      expect(result).toBe('note');
    });

    it('should detect link type with various URL formats', () => {
      const urls = [
        'http://example.com',
        'https://example.com',
        'https://www.example.com',
        'https://subdomain.example.com',
        'https://example.com/path',
        'https://example.com/path?param=value',
        'https://example.com/path#fragment',
      ];

      urls.forEach(url => {
        const result = determinePushType(url);
        expect(result).toBe('link');
      });
    });
  });

  describe('Form Validation Logic', () => {
    // Extract the validateForm logic for testing
    const validateForm = (
      pushTitle: string,
      body: string,
      selectedFile: File | null,
      setErrorMessage: (msg: string) => void
    ): boolean => {
      // Ensure there's some content (title, message, or file)
      if (!pushTitle.trim() && !body.trim() && !selectedFile) {
        setErrorMessage('Please provide a title, message, or file');
        return false;
      }

      return true;
    };

    it('should validate when title is provided', () => {
      let errorMessage = '';
      const setErrorMessage = (msg: string) => {
        errorMessage = msg;
      };

      const result = validateForm('Test Title', '', null, setErrorMessage);
      expect(result).toBe(true);
      expect(errorMessage).toBe('');
    });

    it('should validate when message is provided', () => {
      let errorMessage = '';
      const setErrorMessage = (msg: string) => {
        errorMessage = msg;
      };

      const result = validateForm('', 'Test message', null, setErrorMessage);
      expect(result).toBe(true);
      expect(errorMessage).toBe('');
    });

    it('should validate when file is selected', () => {
      let errorMessage = '';
      const setErrorMessage = (msg: string) => {
        errorMessage = msg;
      };

      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });
      const result = validateForm('', '', file, setErrorMessage);
      expect(result).toBe(true);
      expect(errorMessage).toBe('');
    });

    it('should validate when title and message are provided', () => {
      let errorMessage = '';
      const setErrorMessage = (msg: string) => {
        errorMessage = msg;
      };

      const result = validateForm(
        'Test Title',
        'Test message',
        null,
        setErrorMessage
      );
      expect(result).toBe(true);
      expect(errorMessage).toBe('');
    });

    it('should validate when title and file are provided', () => {
      let errorMessage = '';
      const setErrorMessage = (msg: string) => {
        errorMessage = msg;
      };

      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });
      const result = validateForm('Test Title', '', file, setErrorMessage);
      expect(result).toBe(true);
      expect(errorMessage).toBe('');
    });

    it('should validate when message and file are provided', () => {
      let errorMessage = '';
      const setErrorMessage = (msg: string) => {
        errorMessage = msg;
      };

      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });
      const result = validateForm('', 'Test message', file, setErrorMessage);
      expect(result).toBe(true);
      expect(errorMessage).toBe('');
    });

    it('should validate when all fields are provided', () => {
      let errorMessage = '';
      const setErrorMessage = (msg: string) => {
        errorMessage = msg;
      };

      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });
      const result = validateForm(
        'Test Title',
        'Test message',
        file,
        setErrorMessage
      );
      expect(result).toBe(true);
      expect(errorMessage).toBe('');
    });

    it('should not validate when no content is provided', () => {
      let errorMessage = '';
      const setErrorMessage = (msg: string) => {
        errorMessage = msg;
      };

      const result = validateForm('', '', null, setErrorMessage);
      expect(result).toBe(false);
      expect(errorMessage).toBe('Please provide a title, message, or file');
    });

    it('should not validate when only whitespace is provided', () => {
      let errorMessage = '';
      const setErrorMessage = (msg: string) => {
        errorMessage = msg;
      };

      const result = validateForm('   ', '   ', null, setErrorMessage);
      expect(result).toBe(false);
      expect(errorMessage).toBe('Please provide a title, message, or file');
    });
  });

  describe('URL Detection Edge Cases', () => {
    const determinePushType = (
      message: string,
      file?: File
    ): 'note' | 'link' | 'file' => {
      if (file) return 'file';

      // Strip whitespace from message
      const trimmedMessage = message.trim();

      if (!trimmedMessage) return 'note';

      // Extract URLs from message using improved regex
      const urlRegex = /https?:\/\/[^\s]+/g;
      const urls = trimmedMessage.match(urlRegex);

      // If exactly one URL and message is just that URL (after trimming), it's a link
      if (urls?.length === 1 && trimmedMessage === urls[0]) {
        return 'link';
      }

      // Otherwise it's a note (including multiple URLs or text with URLs)
      return 'note';
    };

    it('should handle URLs with query parameters', () => {
      const result = determinePushType(
        'https://example.com?param=value&other=123'
      );
      expect(result).toBe('link');
    });

    it('should handle URLs with fragments', () => {
      const result = determinePushType('https://example.com/page#section');
      expect(result).toBe('link');
    });

    it('should handle URLs with ports', () => {
      const result = determinePushType('https://example.com:8080/path');
      expect(result).toBe('link');
    });

    it('should handle URLs with subdomains', () => {
      const result = determinePushType('https://sub.example.com');
      expect(result).toBe('link');
    });

    it('should handle URLs with complex paths', () => {
      const result = determinePushType(
        'https://example.com/path/to/resource/123'
      );
      expect(result).toBe('link');
    });

    it('should handle multiple URLs in text', () => {
      const result = determinePushType(
        'Check out https://example1.com and also https://example2.com'
      );
      expect(result).toBe('note');
    });

    it('should handle text with URL in middle', () => {
      const result = determinePushType('Hello https://example.com world');
      expect(result).toBe('note');
    });

    it('should handle text with URL at end', () => {
      const result = determinePushType('Visit this site: https://example.com');
      expect(result).toBe('note');
    });

    it('should handle text with URL at beginning', () => {
      const result = determinePushType('https://example.com is a great site');
      expect(result).toBe('note');
    });

    it('should handle mixed content with URLs', () => {
      const result = determinePushType(
        'Hello world! Check https://example.com for more info.'
      );
      expect(result).toBe('note');
    });
  });
});
