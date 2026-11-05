/** A message that is exactly one URL is a link push; anything else is a note. */
export function determinePushType(
  message: string,
  file?: File
): 'note' | 'link' | 'file' {
  if (file) return 'file';

  const trimmedMessage = message.trim();
  if (!trimmedMessage) return 'note';

  const urls = trimmedMessage.match(/https?:\/\/[^\s]+/g);
  return urls?.length === 1 && trimmedMessage === urls[0] ? 'link' : 'note';
}
