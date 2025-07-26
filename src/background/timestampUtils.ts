/**
 * Simple timestamp utilities for Pushbridge
 * Handles conversion between Pushbullet API (seconds) and JavaScript (milliseconds)
 */

/**
 * Convert Pushbullet timestamp (seconds) to JavaScript timestamp (milliseconds)
 */
export function fromPushbulletTime(seconds: number): number {
  const milliseconds = seconds * 1000;
  
  // Add occasional detailed logging for debugging (only log every 100th call to avoid spam)
  if (Math.random() < 0.01) { // 1% chance to log
    console.log(`⏰ [TimestampUtils] fromPushbulletTime conversion:`, {
      inputSeconds: seconds,
      inputSecondsISO: new Date(seconds * 1000).toISOString(),
      outputMilliseconds: milliseconds,
      outputMillisecondsISO: new Date(milliseconds).toISOString(),
      conversionRatio: '1 second = 1000 milliseconds'
    });
  }
  
  return milliseconds;
}

/**
 * Convert JavaScript timestamp (milliseconds) to Pushbullet time (seconds)
 */
export function toPushbulletTime(milliseconds: number): number {
  const seconds = Math.floor(milliseconds / 1000);
  
  // Add occasional detailed logging for debugging (only log every 100th call to avoid spam)
  if (Math.random() < 0.01) { // 1% chance to log
    console.log(`⏰ [TimestampUtils] toPushbulletTime conversion:`, {
      inputMilliseconds: milliseconds,
      inputMillisecondsISO: new Date(milliseconds).toISOString(),
      outputSeconds: seconds,
      outputSecondsISO: new Date(seconds * 1000).toISOString(),
      conversionRatio: '1000 milliseconds = 1 second (floored)'
    });
  }
  
  return seconds;
}

/**
 * Get current time in milliseconds (JavaScript standard)
 */
export function now(): number {
  return Date.now();
}

/**
 * Log detailed timestamp information for debugging
 * Use this when you need to debug timestamp conversion issues
 */
export function logTimestampComparison(label: string, timestamps: {
  pushbulletApiSeconds?: number;
  javascriptMs?: number;
  lastSeenSeconds?: number;
  lastSeenMs?: number;
}): void {
  console.log(`⏰ [TimestampDebug] ${label}:`, {
    pushbulletApiSeconds: timestamps.pushbulletApiSeconds,
    pushbulletApiISO: timestamps.pushbulletApiSeconds ? new Date(timestamps.pushbulletApiSeconds * 1000).toISOString() : undefined,
    javascriptMs: timestamps.javascriptMs,
    javascriptISO: timestamps.javascriptMs ? new Date(timestamps.javascriptMs).toISOString() : undefined,
    lastSeenSeconds: timestamps.lastSeenSeconds,
    lastSeenISO: timestamps.lastSeenSeconds ? new Date(timestamps.lastSeenSeconds * 1000).toISOString() : undefined,
    lastSeenMs: timestamps.lastSeenMs,
    lastSeenMsISO: timestamps.lastSeenMs ? new Date(timestamps.lastSeenMs).toISOString() : undefined,
    currentTime: Date.now(),
    currentTimeISO: new Date().toISOString(),
    note: 'Pushbullet API uses seconds, JavaScript uses milliseconds'
  });
}

/**
 * Get current time in seconds (Pushbullet format)
 */
export function nowInSeconds(): number {
  return toPushbulletTime(Date.now());
} 