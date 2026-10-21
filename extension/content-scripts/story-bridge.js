(() => {
  "use strict";

  const CHANNEL = "IGDL_STORY_DATA_V1";
  const REQUEST = "IGDL_STORY_DATA_REQUEST";
  const CAPTURED = "IGDL_STORY_DATA_CAPTURED";
  const cache = new Map();
  const mediaCache = new Map();

  const postData = (reels, media) => {
    if (reels.length === 0 && media.length === 0) return;
    window.postMessage(
      {
        channel: CHANNEL,
        type: CAPTURED,
        payload: { reels, media }
      },
      window.location.origin
    );
  };

  const sanitizeCandidates = (versions) =>
    Array.isArray(versions)
      ? versions.map((item) => ({
          width: item.width,
          height: item.height,
          url: item.url
        }))
      : null;

  const sanitizeMedia = (media) => {
    if (!media || typeof media !== "object") return null;
    return {
      id: media.id,
      pk: media.pk,
      code: media.code,
      taken_at: media.taken_at,
      media_type: media.media_type,
      user: media.user
        ? {
            id: media.user.id,
            pk: media.user.pk,
            username: media.user.username
          }
        : null,
      image_versions2: media.image_versions2
        ? {
            candidates: sanitizeCandidates(media.image_versions2.candidates) || []
          }
        : null,
      video_versions: sanitizeCandidates(media.video_versions),
      carousel_media: Array.isArray(media.carousel_media)
        ? media.carousel_media.map(sanitizeMedia).filter(Boolean)
        : null
    };
  };

  const sanitizeReel = (reel) => {
    if (!reel || !Array.isArray(reel.items) || reel.items.length === 0) {
      return null;
    }
    return {
      id: reel.id,
      user: reel.user
        ? {
            id: reel.user.id,
            pk: reel.user.pk,
            username: reel.user.username
          }
        : null,
      items: reel.items.map(sanitizeMedia).filter(Boolean)
    };
  };

  const addReel = (reel) => {
    const sanitized = sanitizeReel(reel);
    if (!sanitized) return null;
    const key = String(
      sanitized.id ||
        (sanitized.user && sanitized.user.username) ||
        sanitized.items.length
    );
    cache.set(key, sanitized);
    return sanitized;
  };

  const addMedia = (media) => {
    if (!media || typeof media !== "object") return null;
    const hasVisual =
      Array.isArray(media.video_versions) ||
      (media.image_versions2 &&
        Array.isArray(media.image_versions2.candidates)) ||
      Array.isArray(media.carousel_media);
    if (!hasVisual) return null;
    const key = String(
      media.pk ||
        (typeof media.id === "string" ? media.id.split("_")[0] : media.id) ||
        media.code ||
        ""
    );
    if (!key) return null;
    const sanitized = sanitizeMedia(media);
    mediaCache.set(key, sanitized);
    if (mediaCache.size > 2000) {
      mediaCache.delete(mediaCache.keys().next().value);
    }
    return { key, media: sanitized };
  };

  const captureRoot = (root) => {
    const found = [];
    const foundMedia = [];
    const seenReels = new Set();
    const seenMedia = new Set();
    const stack = [root];
    let visited = 0;
    while (stack.length > 0 && visited < 30000) {
      const value = stack.pop();
      visited += 1;
      if (!value || typeof value !== "object") continue;

      const addedMedia = addMedia(value);
      if (addedMedia && !seenMedia.has(addedMedia.key)) {
        seenMedia.add(addedMedia.key);
        foundMedia.push(addedMedia.media);
      }

      if (Array.isArray(value.reels_media)) {
        for (const reel of value.reels_media) {
          const sanitized = addReel(reel);
          const key = sanitized && String(sanitized.id || sanitized.items.length);
          if (sanitized && !seenReels.has(key)) {
            seenReels.add(key);
            found.push(sanitized);
          }
        }
      }

      const connection = value.xdt_api__v1__feed__reels_media__connection;
      if (connection && Array.isArray(connection.edges)) {
        for (const edge of connection.edges) {
          const sanitized = addReel(edge && edge.node);
          const key = sanitized && String(sanitized.id || sanitized.items.length);
          if (sanitized && !seenReels.has(key)) {
            seenReels.add(key);
            found.push(sanitized);
          }
        }
      }

      for (const child of Object.values(value)) {
        if (child && typeof child === "object") stack.push(child);
      }
    }
    postData(found, foundMedia);
  };

  const inspectText = (text) => {
    if (
      !text.includes("xdt_api__v1__feed__reels_media") &&
      !text.includes('"reels_media"')
    ) {
      return;
    }
    try {
      captureRoot(JSON.parse(text));
    } catch {
      // Ignore non-JSON or partial responses.
    }
  };

  const isStoryResponse = (rawUrl) => {
    try {
      const url = new URL(rawUrl, window.location.href);
      const pathname = url.pathname.replace(/\/+$/, "") || "/";
      return (
        /(^|\.)instagram\.com$/i.test(url.hostname) &&
        (pathname === "/graphql/query" ||
          pathname === "/api/graphql" ||
          pathname.includes("/feed/reels_media/"))
      );
    } catch {
      return false;
    }
  };

  const originalFetch = window.fetch;
  if (typeof originalFetch === "function") {
    window.fetch = function (...args) {
      const result = originalFetch.apply(this, args);
      result.then(
        (response) => {
          try {
            if (response.ok && isStoryResponse(response.url)) {
              response
                .clone()
                .text()
                .then(inspectText)
                .catch(() => undefined);
            }
          } catch {
            // Never interfere with Instagram's original response handling.
          }
        },
        () => undefined
      );
      return result;
    };
  }

  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (body) {
    this.addEventListener(
      "load",
      () => {
        try {
          if (
            isStoryResponse(this.responseURL) &&
            (this.responseType === "" || this.responseType === "text")
          ) {
            inspectText(this.responseText);
          }
        } catch {
          // Ignore unreadable responses.
        }
      },
      { once: true }
    );
    return originalSend.call(this, body);
  };

  window.addEventListener("message", (event) => {
    if (
      event.source !== window ||
      event.origin !== window.location.origin ||
      event.data?.channel !== CHANNEL ||
      event.data?.type !== REQUEST
    ) {
      return;
    }
    postData([...cache.values()], [...mediaCache.values()]);
  });
})();
