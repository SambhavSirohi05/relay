/**
 * selectors.js — Platform selector configuration
 * 
 * Pure config. No logic. Updating support for a platform
 * that changed its DOM is a one-line edit here.
 */

const RELAY_SELECTORS = {
  "claude.ai": {
    platform: "Claude.ai",
    // Each entry is an array of selectors tried in order (first match wins)
    user: [
      "[data-testid=\"user-message\"]"
    ],
    assistant: [
      ".font-claude-message",
      "[data-is-streaming=\"false\"]"
    ],
    // The container that holds the full conversation thread
    container: "[class*='flex'][class*='flex-col']"
  },

  "chatgpt.com": {
    platform: "ChatGPT",
    user: [
      "[data-message-author-role=\"user\"]"
    ],
    assistant: [
      "[data-message-author-role=\"assistant\"]"
    ],
    container: "main"
  },

  // chat.openai.com redirects to chatgpt.com but keep as fallback
  "chat.openai.com": {
    platform: "ChatGPT",
    user: [
      "[data-message-author-role=\"user\"]"
    ],
    assistant: [
      "[data-message-author-role=\"assistant\"]"
    ],
    container: "main"
  }
};
