export function getVimeoId(url) {
  if (!url) return null;

  const value = String(url).trim();
  const cleanId = value.replace(/^https?:\/\//i, '');

  if (/^\d+$/.test(cleanId)) {
    return cleanId;
  }

  const regex =
    /^(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/(?:.*\/)?|player\.vimeo\.com\/video\/)(\d+)/i;

  const match = value.match(regex);
  return match ? match[1] : null;
}

function isVimeoLink(source) {
  if (!source) return false;
  const id = getVimeoId(source);

  if (id) {
    return `https://player.vimeo.com/video/${id}`;
  }

  return false;
}

export default isVimeoLink;