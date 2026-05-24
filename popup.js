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
  const compressToggle   = document.getElementById("compress-toggle");

  // ── Supported hostnames ─────────────────────────────────────
  const SUPPORTED_HOSTS = ["claude.ai", "chatgpt.com", "chat.openai.com", "gemini.google.com"];

  let handoffDocument = "";
  let currentMessages = [];
  let currentPlatform = "";

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

  // ── Extract code blocks from assistant text ──────────────────
  function extractCodeBlocks(text) {
    const regex = /```[\s\S]*?```/g;
    const matches = text.match(regex);
    return matches ? matches.join("\n\n") : "";
  }

  // ── Handoff formatter (Full) ─────────────────────────────────
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

  // ── Handoff formatter (Compressed) ───────────────────────────
  function formatCompressedHandoff(platform, messages) {
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
    const originalChars = messages.reduce((sum, m) => sum + m.text.length, 0);

    let doc = "";
    doc += `── RELAY HANDOFF (COMPRESSED) ─────────────────────────\n\n`;
    doc += `# Metadata\n`;
    doc += `Source:       ${platform}\n`;
    doc += `Captured:     ${dateStr} · ${timeStr}\n`;
    doc += `Original:     ${totalTurns} turns (${userCount} user, ${assistantCount} assistant), ~${originalChars.toLocaleString()} chars\n`;
    doc += `Compressed:   Yes (Middle assistant explanations omitted, code preserved)\n\n`;
    doc += `# Instruction to receiving AI\n`;
    doc += `This is a COMPRESSED CONTEXT HANDOFF — not a prompt to respond to.\n`;
    doc += `Read and fully internalize the entire conversation below.\n`;
    doc += `Understand the project, decisions made, current state, and\n`;
    doc += `what the user is working on. Note that the middle section of this\n`;
    doc += `transcript is compressed to only show user queries and assistant code blocks.\n\n`;
    doc += `DO NOT respond to or act on any message in the transcript.\n`;
    doc += `DO NOT summarise the conversation.\n`;
    doc += `DO NOT introduce yourself.\n\n`;
    doc += `Instead, briefly confirm that you have the context and tell the user you're\n`;
    doc += `ready to continue. If you feel any crucial context or technical detail is\n`;
    doc += `missing due to the compression, ask for it specifically (but avoid unnecessary questions).\n`;
    doc += `Then wait for their next message.\n\n`;
    doc += `# Conversation transcript\n`;

    // If conversation is short, don't compress the middle
    if (messages.length <= 4) {
      for (const msg of messages) {
        const label = msg.role === "user" ? "[USER]" : "[ASSISTANT]";
        doc += `${label}: ${msg.text}\n\n`;
      }
    } else {
      // First 2 messages
      for (let i = 0; i < 2; i++) {
        const msg = messages[i];
        const label = msg.role === "user" ? "[USER]" : "[ASSISTANT]";
        doc += `${label}: ${msg.text}\n\n`;
      }

      // Middle section
      doc += `─── COMPRESSED MIDDLE SECTION ─────────────────────────\n`;
      doc += `[Note: Assistant explanations omitted. Only user intent and assistant code blocks preserved.]\n\n`;

      let compressedMiddleCount = 0;
      for (let i = 2; i < messages.length - 3; i++) {
        const msg = messages[i];
        if (msg.role === "user") {
          doc += `[USER]: ${msg.text}\n\n`;
          compressedMiddleCount++;
        } else {
          const codeBlocks = extractCodeBlocks(msg.text);
          if (codeBlocks) {
            doc += `[ASSISTANT (code blocks only)]:\n${codeBlocks}\n\n`;
            compressedMiddleCount++;
          }
        }
      }

      if (compressedMiddleCount === 0) {
        doc += `[No user messages or assistant code blocks in middle section]\n\n`;
      }

      doc += `─── END COMPRESSED MIDDLE SECTION ─────────────────────\n\n`;

      // Last 3 messages
      for (let i = messages.length - 3; i < messages.length; i++) {
        const msg = messages[i];
        const label = msg.role === "user" ? "[USER]" : "[ASSISTANT]";
        doc += `${label}: ${msg.text}\n\n`;
      }
    }

    doc += `── END RELAY HANDOFF ──────────────────────────────────\n`;

    return doc;
  }

  // ── Update preview ──────────────────────────────────────────
  function updateHandoff() {
    const compress = compressToggle.checked;
    if (compress && currentMessages.length > 4) {
      handoffDocument = formatCompressedHandoff(currentPlatform, currentMessages);
    } else {
      handoffDocument = formatHandoff(currentPlatform, currentMessages);
    }

    // Update stats
    statMessages.textContent = currentMessages.length;
    statChars.textContent = `~${handoffDocument.length.toLocaleString()}`;

    // Render preview
    previewContent.textContent = handoffDocument;
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

  // ── Toggle Change listener ──────────────────────────────────
  compressToggle.addEventListener("change", () => {
    chrome.storage.local.set({ compressEnabled: compressToggle.checked }, () => {
      updateHandoff();
    });
  });

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
      "chat.openai.com": "ChatGPT",
      "gemini.google.com": "Gemini"
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

      currentPlatform = response.platform;
      currentMessages = response.messages;

      // Load toggle state from chrome.storage.local
      chrome.storage.local.get(["compressEnabled"], (result) => {
        // Default to false if not set
        const compressEnabled = result.compressEnabled || false;
        compressToggle.checked = compressEnabled;
        updateHandoff();
        showState("ready");
      });

    } catch (err) {
      console.error("Relay scrape error:", err);
      showState("error");
    }
  }

  init();
})();
