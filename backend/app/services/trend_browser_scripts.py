from __future__ import annotations


def raw_visible_items_script() -> str:
    return """
() => {
  const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
  const firstText = (root, selectors, maxLength = 80) => {
    for (const selector of selectors) {
      for (const element of Array.from(root.querySelectorAll(selector)).slice(0, 8)) {
        const text = normalize(element.innerText || element.textContent || element.getAttribute('aria-label') || element.getAttribute('title') || '');
        if (text && text.length <= maxLength) return text;
      }
    }
    return '';
  };
  const metricText = (root, selectors) => {
    const values = [];
    for (const selector of selectors) {
      for (const element of Array.from(root.querySelectorAll(selector)).slice(0, 8)) {
        const text = normalize([
          element.getAttribute('aria-label') || '',
          element.getAttribute('title') || '',
          element.innerText || element.textContent || ''
        ].join(' '));
        if (text) values.push(text);
      }
    }
    return values.join(' ');
  };
  const urlFromSrcset = (srcset) => {
    const candidates = String(srcset || '')
      .split(',')
      .map((part) => part.trim().split(/\\s+/)[0])
      .filter(Boolean);
    return candidates[candidates.length - 1] || '';
  };
  const cssImageUrl = (value) => {
    const match = String(value || '').match(/url\\((['"]?)(.*?)\\1\\)/);
    return match ? match[2] : '';
  };
  const imageUrl = (image) => (
    image.currentSrc ||
    image.src ||
    image.getAttribute('data-src') ||
    image.getAttribute('data-original') ||
    image.getAttribute('data-original-src') ||
    image.getAttribute('data-lazy') ||
    image.getAttribute('data-lazy-src') ||
    image.getAttribute('data-url') ||
    urlFromSrcset(image.getAttribute('srcset')) ||
    urlFromSrcset(image.getAttribute('data-srcset')) ||
    ''
  );
  const candidateRoots = (root, linkNode) => {
    const roots = [];
    const push = (node) => {
      if (node && !roots.includes(node)) roots.push(node);
    };
    push(root);
    push(linkNode);
    push(linkNode?.closest('article, section, [class*="note"], [class*="card"], [class*="feed"], [class*="item"]'));
    push(root.closest?.('article, section, [class*="note"], [class*="card"], [class*="feed"], [class*="item"]'));
    push(root.parentElement);
    return roots;
  };
  const coverUrl = (root, linkNode) => {
    const images = [];
    for (const candidateRoot of candidateRoots(root, linkNode)) {
      const rootRect = candidateRoot.getBoundingClientRect();
      const backgroundUrl = cssImageUrl(getComputedStyle(candidateRoot).backgroundImage);
      if (backgroundUrl) {
        images.push({
          url: backgroundUrl,
          area: rootRect.width * rootRect.height,
          marker: String(candidateRoot.className || '').toLowerCase()
        });
      }
      for (const image of Array.from(candidateRoot.querySelectorAll('img, picture source')).slice(0, 12)) {
        const owner = image.tagName === 'SOURCE' ? image.closest('picture') || image : image;
        const rect = owner.getBoundingClientRect();
        const url = image.tagName === 'SOURCE' ? urlFromSrcset(image.getAttribute('srcset')) : imageUrl(image);
        const marker = `${image.className || ''} ${image.alt || ''}`.toLowerCase();
        images.push({ url, area: rect.width * rect.height, marker });
      }
    }
    return images.filter((item) => {
      if (!item.url || item.url.startsWith('data:') || item.url.startsWith('blob:')) return false;
      if (item.area < 1600) return false;
      return !/avatar|user|icon|logo|sprite|emoji/.test(item.marker);
    }).sort((left, right) => right.area - left.area)[0]?.url || '';
  };
  const selectors = [
    'a[href*="/explore/"]',
    'a[href*="/discovery/item/"]',
    'article',
    'section',
    '[class*="note"]',
    '[class*="card"]',
    'a',
    'div'
  ];
  const nodes = [];
  const seen = new Set();
  for (const selector of selectors) {
    for (const node of Array.from(document.querySelectorAll(selector)).slice(0, 900)) {
      if (seen.has(node)) continue;
      seen.add(node);
      nodes.push(node);
      if (nodes.length >= 1200) break;
    }
    if (nodes.length >= 1200) break;
  }
  const items = [];
  for (const node of nodes) {
    const linkNode = node.tagName === 'A' ? node : node.querySelector('a[href]');
    const text = [
      node.innerText || node.textContent || '',
      node.getAttribute('aria-label') || '',
      node.getAttribute('title') || '',
      linkNode?.getAttribute('aria-label') || '',
      linkNode?.getAttribute('title') || ''
    ].join(' ').trim();
    if (!text || text.length < 20) continue;
    const url = linkNode ? linkNode.href : location.href;
    items.push({
      text,
      url,
      className: String(node.className || ''),
      author: firstText(node, [
        '[class*="author"] [class*="name"]',
        '[class*="author"]',
        'a[href*="/user/profile/"]',
        '[class*="user"] [class*="name"]',
        '[class*="nickname"]'
      ]),
      likesText: metricText(node, ['[class*="like"]', '[aria-label*="赞"]', '[title*="赞"]']),
      favoritesText: metricText(node, [
        '[class*="collect"]',
        '[class*="favorite"]',
        '[aria-label*="藏"]',
        '[aria-label*="收藏"]',
        '[title*="藏"]',
        '[title*="收藏"]'
      ]),
      commentsText: metricText(node, ['[class*="comment"]', '[aria-label*="评"]', '[title*="评"]']),
      sharesText: metricText(node, [
        '[class*="share"]',
        '[aria-label*="转"]',
        '[aria-label*="分享"]',
        '[title*="转"]',
        '[title*="分享"]'
      ]),
      coverUrl: coverUrl(node, linkNode)
    });
    if (items.length >= 240) break;
  }
  return items;
}
""".strip()


def detail_visible_item_script() -> str:
    return """
() => {
  const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
  const meta = (selector) => normalize(document.querySelector(selector)?.getAttribute('content') || '');
  const firstText = (selectors, maxLength = 160) => {
    for (const selector of selectors) {
      for (const element of Array.from(document.querySelectorAll(selector)).slice(0, 12)) {
        const text = normalize(element.innerText || element.textContent || element.getAttribute('aria-label') || element.getAttribute('title') || '');
        if (text && text.length <= maxLength) return text;
      }
    }
    return '';
  };
  const longestText = (selectors) => {
    const values = [];
    for (const selector of selectors) {
      for (const element of Array.from(document.querySelectorAll(selector)).slice(0, 24)) {
        const text = normalize(element.innerText || element.textContent || '');
        if (text && text.length >= 10) values.push(text);
      }
    }
    values.sort((left, right) => right.length - left.length);
    return values[0] || '';
  };
  const metricText = (selectors) => {
    const values = [];
    for (const selector of selectors) {
      for (const element of Array.from(document.querySelectorAll(selector)).slice(0, 12)) {
        const text = normalize([
          element.getAttribute('aria-label') || '',
          element.getAttribute('title') || '',
          element.innerText || element.textContent || ''
        ].join(' '));
        if (text) values.push(text);
      }
    }
    return values.join(' ');
  };
  const urlFromSrcset = (srcset) => {
    const candidates = String(srcset || '')
      .split(',')
      .map((part) => part.trim().split(/\\s+/)[0])
      .filter(Boolean);
    return candidates[candidates.length - 1] || '';
  };
  const cssImageUrl = (value) => {
    const match = String(value || '').match(/url\\((['"]?)(.*?)\\1\\)/);
    return match ? match[2] : '';
  };
  const imageUrl = (image) => (
    image.currentSrc ||
    image.src ||
    image.getAttribute('data-src') ||
    image.getAttribute('data-original') ||
    image.getAttribute('data-original-src') ||
    image.getAttribute('data-lazy') ||
    image.getAttribute('data-lazy-src') ||
    image.getAttribute('data-url') ||
    urlFromSrcset(image.getAttribute('srcset')) ||
    urlFromSrcset(image.getAttribute('data-srcset')) ||
    ''
  );
  const coverUrl = () => {
    const metaImage = meta('meta[property="og:image"]') || meta('meta[name="og:image"]');
    if (metaImage) return metaImage;
    const images = [];
    for (const element of Array.from(document.querySelectorAll('main, article, section, [class*="note"], [class*="content"], [class*="media"]')).slice(0, 40)) {
      const rect = element.getBoundingClientRect();
      const backgroundUrl = cssImageUrl(getComputedStyle(element).backgroundImage);
      if (backgroundUrl) {
        images.push({
          url: backgroundUrl,
          area: rect.width * rect.height,
          marker: String(element.className || '').toLowerCase()
        });
      }
    }
    for (const image of Array.from(document.querySelectorAll('img, picture source')).slice(0, 80)) {
      const owner = image.tagName === 'SOURCE' ? image.closest('picture') || image : image;
      const rect = owner.getBoundingClientRect();
      const url = image.tagName === 'SOURCE' ? urlFromSrcset(image.getAttribute('srcset')) : imageUrl(image);
      const marker = `${image.className || ''} ${image.alt || ''}`.toLowerCase();
      images.push({ url, area: rect.width * rect.height, marker });
    }
    return images.filter((item) => {
      if (!item.url || item.url.startsWith('data:') || item.url.startsWith('blob:')) return false;
      if (item.area < 1600) return false;
      return !/avatar|user|icon|logo|sprite|emoji/.test(item.marker);
    }).sort((left, right) => right.area - left.area)[0]?.url || '';
  };
  return {
    title: meta('meta[property="og:title"]') || firstText(['h1', '[class*="title"]']) || document.title,
    content: meta('meta[name="description"]') || meta('meta[property="og:description"]') || longestText([
      '[class*="desc"]',
      '[class*="content"]',
      '[class*="note"]',
      'main'
    ]),
    author: firstText([
      '[class*="author"] [class*="name"]',
      '[class*="author"]',
      'a[href*="/user/profile/"]',
      '[class*="user"] [class*="name"]',
      '[class*="nickname"]'
    ], 80),
    likesText: metricText(['[class*="like"]', '[aria-label*="赞"]', '[title*="赞"]']),
    favoritesText: metricText([
      '[class*="collect"]',
      '[class*="favorite"]',
      '[aria-label*="藏"]',
      '[aria-label*="收藏"]',
      '[title*="藏"]',
      '[title*="收藏"]'
    ]),
    commentsText: metricText(['[class*="comment"]', '[aria-label*="评"]', '[title*="评"]']),
    sharesText: metricText([
      '[class*="share"]',
      '[aria-label*="转"]',
      '[aria-label*="分享"]',
      '[title*="转"]',
      '[title*="分享"]'
    ]),
    coverUrl: coverUrl()
  };
}
""".strip()
