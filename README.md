# Relay 🚀

**Relay** is a privacy-first, zero-dependency Chrome extension designed to make agent-to-agent and human-to-agent handoffs seamless. It captures your active AI conversation threads from Claude, ChatGPT, or Gemini, normalizes them, and generates a structured handoff document. 

You can paste this document into any other AI to continue your session instantly with perfect context retention.

---

## Key Features

*   **Multi-Platform Support**: Works natively on **Claude.ai**, **ChatGPT** (chatgpt.com & chat.openai.com), and **Gemini** (gemini.google.com).
*   **Smart Local Compression**: Toggle **Compress** mode to trim down long transcripts. Relay preserves:
    *   The **first 2 messages** (initial context & goals).
    *   The **last 3 messages** (current active state & last prompt).
    *   **All user intent/messages** in the middle (timeline of decisions).
    *   **All assistant code blocks** (technical implementation).
    *   *Strips out conversational fluff and verbose explanations.*
*   **AI Instructions Built-In**: Automatically prepends a strict primer instructing the receiving AI on how to interpret the handoff without responding to old logs.
*   **Preferences Persistence**: Remembers your preferred compression mode across sessions.
*   **Premium UI**: A sleek, minimal layout that respects your system's light/dark mode settings.

---

## Privacy & Security 🔒

Relay is built with strict privacy in mind:
*   **No Conversation Storage**: Conversations and transcripts are parsed purely in temporary memory (RAM). Once you close the extension popup, all scraped text is immediately cleared.
*   **Zero External Networks**: Relay has no backend, no database, and does not make any external API requests or analytics calls. Your keys, conversations, and metadata never leave your local machine.

---

## Installation & Setup (Developer Mode)

To use Relay locally, you can load it as an unpacked extension in Google Chrome or any Chromium-supported browser:

### 1. Clone the Repository
Clone this repository to your local machine:
```bash
git clone https://github.com/SambhavSirohi05/relay.git
cd relay
```

### 2. Load the Unpacked Extension
1.  Open Google Chrome (or any Chromium-supported browser like Brave, Edge, Arc, Opera) and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** by toggling the switch in the top-right corner.
3.  Click the **Load unpacked** button in the top-left corner.
4.  Select the `relay` directory (the folder containing `manifest.json`) from your file system.

*That's it! Relay will now appear in your extension toolbar.*

---

## How It Works

1.  Open any active chat on Claude, ChatGPT, or Gemini.
2.  Click the **Relay** icon in your toolbar.
3.  Choose between **Full** or **Compressed** mode using the toggle in the stats bar.
4.  Click **Copy handoff** to copy the formatted document to your clipboard.
5.  Paste it directly into your next AI window.
