/**
 * content.js — DOM scraper
 *
 * Injected into matching tabs. Listens for a "scrape" message,
 * walks the DOM using platform selectors, and returns a clean
 * JSON array of message objects.
 */

(() => {
  "use strict";

  /**
   * Resolve the first matching selector from an array of candidates.
   * Returns a NodeList (possibly empty).
   */
  function queryAll(selectors) {
    for (const sel of selectors) {
      const nodes = document.querySelectorAll(sel);
      if (nodes.length > 0) return Array.from(nodes);
    }
    return [];
  }

  /**
   * Extract clean text content from a DOM node.
   * Strips excessive whitespace while preserving paragraph breaks.
   */
  function extractText(node) {
    // Clone to avoid mutating the live DOM
    const clone = node.cloneNode(true);

    // Remove any buttons, toolbars, action bars inside messages
    clone.querySelectorAll("button, [role='toolbar'], [class*='action']").forEach(el => el.remove());

    // Get text, normalise whitespace per line, collapse blank lines
    const raw = clone.innerText || clone.textContent || "";
    return raw
      .split("\n")
      .map(line => line.trim())
      .filter((line, i, arr) => {
        // Remove consecutive blank lines
        if (line === "" && i > 0 && arr[i - 1] === "") return false;
        return true;
      })
      .join("\n")
      .trim();
  }

  /**
   * Walk the DOM and build an ordered message array.
   *
   * Strategy: query all user and assistant nodes, then sort them
   * by their document position to preserve conversation order.
   */
  function scrape(config) {
    const userNodes = queryAll(config.user);
    const assistantNodes = queryAll(config.assistant);

    // Tag each node with its role
    const tagged = [];
    userNodes.forEach(node => tagged.push({ role: "user", node }));
    assistantNodes.forEach(node => tagged.push({ role: "assistant", node }));

    // Sort by document order
    tagged.sort((a, b) => {
      const pos = a.node.compareDocumentPosition(b.node);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    // Extract text
    const messages = [];
    for (const { role, node } of tagged) {
      const text = extractText(node);
      if (text.length > 0) {
        messages.push({ role, text });
      }
    }

    return messages;
  }

  // ── Message listener ───────────────────────────────────────────
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action !== "scrape") return false;

    const hostname = window.location.hostname.replace(/^www\./, "");
    const config = typeof RELAY_SELECTORS !== "undefined"
      ? RELAY_SELECTORS[hostname]
      : null;

    if (!config) {
      sendResponse({ success: false, error: "unsupported", platform: null, messages: [] });
      return true;
    }

    try {
      const messages = scrape(config);
      sendResponse({
        success: messages.length > 0,
        error: messages.length === 0 ? "no_messages" : null,
        platform: config.platform,
        messages
      });
    } catch (err) {
      sendResponse({ success: false, error: err.message, platform: config.platform, messages: [] });
    }

    return true; // keep the message channel open for async response
  });
})();
