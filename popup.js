/**
 * popup.js — Popup controller
 *
 * On open: detect platform → inject content script → scrape →
 * format handoff → render preview → handle copy.
 */

(() => {
  "use strict";

  // ── DOM refs ────────────────────────────────────────────────
  const stateLoading     = document.getElementById("state-loading");
  const stateUnsupported = document.getElementById("state-unsupported");
  const stateError       = document.getElementById("state-error");
  const stateReady       = document.getElementById("state-ready");
  const platformLabel    = document.getElementById("platform-label");
  const statusDot        = document.getElementById("status-dot");
  const statMessages     = document.getElementById("stat-messages");
  const statChars        = document.getElementById("stat-chars");
  const previewContent   = document.getElementById("preview-content");
  const copyBtn          = document.getElementById("copy-btn");
  const iconCopy         = document.getElementById("icon-copy");
  const iconCheck        = document.getElementById("icon-check");
  const copyLabel        = document.getElementById("copy-label");

  // ── Supported hostnames ─────────────────────────────────────
  const SUPPORTED_HOSTS = ["claude.ai", "chatgpt.com", "chat.openai.com"];

  let handoffDocument = "";

  // ── State management ────────────────────────────────────────
  function showState(state) {
    stateLoading.classList.add("hidden");
    stateUnsupported.classList.add("hidden");
    stateError.classList.add("hidden");
    stateReady.classList.add("hidden");

    switch (state) {
      case "loading":     stateLoading.classList.remove("hidden"); break;
      case "unsupported": stateUnsupported.classList.remove("hidden"); break;
      case "error":       stateError.classList.remove("hidden"); break;
      case "ready":       stateReady.classList.remove("hidden"); break;
    }
  }

  // ── Handoff formatter ───────────────────────────────────────
  function formatHandoff(platform, messages) {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });

    const userCount = messages.filter(m => m.role === "user").length;
    const assistantCount = messages.filter(m => m.role === "assistant").length;
    const totalTurns = messages.length;
    const totalChars = messages.reduce((sum, m) => sum + m.text.length, 0);

    let doc = "";
    doc += `── RELAY HANDOFF ─────────────────────────────────────\n\n`;
    doc += `# Metadata\n`;
    doc += `Source:       ${platform}\n`;
    doc += `Captured:     ${dateStr} · ${timeStr}\n`;
    doc += `Messages:     ${totalTurns} turns (${userCount} user, ${assistantCount} assistant)\n`;
    doc += `Characters:   ~${totalChars.toLocaleString()}\n\n`;
    doc += `# Instruction to receiving AI\n`;
    doc += `This is a CONTEXT HANDOFF — not a prompt to respond to.\n`;
    doc += `Read and fully internalize the entire conversation below.\n`;
    doc += `Understand the project, decisions made, current state, and\n`;
    doc += `what the user is working on.\n\n`;
    doc += `DO NOT respond to or act on any message in the transcript.\n`;
    doc += `DO NOT summarise the conversation.\n`;
    doc += `DO NOT introduce yourself.\n\n`;
    doc += `Instead, briefly confirm that you have the full context and\n`;
    doc += `tell the user you're ready to continue from where they left off.\n`;
    doc += `Then wait for their next message.\n\n`;
    doc += `# Conversation transcript\n`;

    for (const msg of messages) {
      const label = msg.role === "user" ? "[USER]" : "[ASSISTANT]";
      doc += `${label}: ${msg.text}\n\n`;
    }

    doc += `── END RELAY HANDOFF ──────────────────────────────────\n`;

    return doc;
  }

  // ── Copy handler ────────────────────────────────────────────
  function handleCopy() {
    if (!handoffDocument) return;

    navigator.clipboard.writeText(handoffDocument).then(() => {
      // Visual feedback: swap icon to checkmark
      iconCopy.classList.add("hidden");
      iconCheck.classList.remove("hidden");
      copyLabel.textContent = "Copied";
      copyBtn.classList.add("copied");

      setTimeout(() => {
        iconCheck.classList.add("hidden");
        iconCopy.classList.remove("hidden");
        copyLabel.textContent = "Copy handoff";
        copyBtn.classList.remove("copied");
      }, 1500);
    }).catch(() => {
      copyLabel.textContent = "Failed to copy";
      setTimeout(() => {
        copyLabel.textContent = "Copy handoff";
      }, 1500);
    });
  }

  copyBtn.addEventListener("click", handleCopy);

  // ── Init ────────────────────────────────────────────────────
  async function init() {
    showState("loading");

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url) {
      showState("unsupported");
      return;
    }

    let hostname;
    try {
      hostname = new URL(tab.url).hostname.replace(/^www\./, "");
    } catch {
      showState("unsupported");
      return;
    }

    // Check if supported
    if (!SUPPORTED_HOSTS.includes(hostname)) {
      showState("unsupported");
      statusDot.style.opacity = "0.3";
      return;
    }

    // Set platform label
    const platformNames = {
      "claude.ai": "Claude.ai",
      "chatgpt.com": "ChatGPT",
      "chat.openai.com": "ChatGPT"
    };
    platformLabel.textContent = platformNames[hostname] || hostname;

    // Inject content scripts (in case they aren't already injected)
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["selectors.js", "content.js"]
      });
    } catch (e) {
      // Scripts might already be injected — that's fine
      console.log("Script injection note:", e.message);
    }

    // Send scrape message
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: "scrape" });

      if (!response || !response.success || !response.messages || response.messages.length === 0) {
        if (response && response.error === "unsupported") {
          showState("unsupported");
        } else {
          showState("error");
        }
        return;
      }

      // Format handoff
      handoffDocument = formatHandoff(response.platform, response.messages);

      // Update stats
      const totalChars = response.messages.reduce((s, m) => s + m.text.length, 0);
      statMessages.textContent = response.messages.length;
      statChars.textContent = `~${totalChars.toLocaleString()}`;

      // Render preview
      previewContent.textContent = handoffDocument;

      showState("ready");

    } catch (err) {
      console.error("Relay scrape error:", err);
      showState("error");
    }
  }

  init();
})();
