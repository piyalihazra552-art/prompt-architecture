/**
 * Dola AI 30s Studio Pro - Popup Script
 */
document.addEventListener("DOMContentLoaded", () => {
  const direct30sToggle = document.getElementById("popup-direct30s");
  const autoExtendToggle = document.getElementById("popup-autoextend");
  const autoDownloadToggle = document.getElementById("popup-autodownload");
  const batchInput = document.getElementById("batch-prompts-input");
  const promptCount = document.getElementById("prompt-count");
  const btnStartBatch = document.getElementById("btn-start-batch");
  const statusIndicator = document.getElementById("connection-status");

  // 1. Load initial settings
  chrome.storage.local.get(["direct30sEnabled", "autoExtendEnabled", "autoDownloadEnabled", "batchPrompts"], (data) => {
    if (data.direct30sEnabled !== undefined) direct30sToggle.checked = data.direct30sEnabled;
    if (data.autoExtendEnabled !== undefined) autoExtendToggle.checked = data.autoExtendEnabled;
    if (data.autoDownloadEnabled !== undefined) autoDownloadToggle.checked = data.autoDownloadEnabled;
    if (data.batchPrompts) {
      batchInput.value = data.batchPrompts;
      updatePromptCount();
    }
  });

  // Check if Dola is active in the current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url && tabs[0].url.includes("dola.com")) {
      statusIndicator.textContent = "Dola AI Connected";
      statusIndicator.style.color = "#34d399";
    } else {
      statusIndicator.textContent = "Standby (Open Dola.com)";
      statusIndicator.style.color = "#9ca3af";
    }
  });

  // 2. Save settings on change & notify active tab
  function updateSettings() {
    const newSettings = {
      direct30sEnabled: direct30sToggle.checked,
      autoExtendEnabled: autoExtendToggle.checked,
      autoDownloadEnabled: autoDownloadToggle.checked
    };

    chrome.storage.local.set(newSettings);

    // Broadcast to active Dola tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "UPDATE_SETTINGS",
          settings: newSettings
        }).catch(() => {});
      }
    });
  }

  direct30sToggle.addEventListener("change", updateSettings);
  autoExtendToggle.addEventListener("change", updateSettings);
  autoDownloadToggle.addEventListener("change", updateSettings);

  // 3. Batch Prompts Management
  function updatePromptCount() {
    const lines = batchInput.value.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    promptCount.textContent = `${lines.length} Prompts`;
  }

  batchInput.addEventListener("input", () => {
    updatePromptCount();
    chrome.storage.local.set({ batchPrompts: batchInput.value });
  });

  // Send next prompt to Dola AI input box
  btnStartBatch.addEventListener("click", () => {
    const lines = batchInput.value.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      alert("Please enter at least one prompt in the box!");
      return;
    }

    const nextPrompt = lines[0];
    const remainingPrompts = lines.slice(1).join("\n");

    // Execute in current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !tabs[0].url || !tabs[0].url.includes("dola.com")) {
        alert("Please open https://www.dola.com/chat first!");
        return;
      }

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (promptText) => {
          // Find Dola prompt textarea or contenteditable input
          const inputEl = document.querySelector("textarea, [contenteditable='true'], input[type='text']");
          if (inputEl) {
            if (inputEl.tagName.toLowerCase() === "textarea" || inputEl.tagName.toLowerCase() === "input") {
              inputEl.value = promptText;
              inputEl.dispatchEvent(new Event("input", { bubbles: true }));
              inputEl.dispatchEvent(new Event("change", { bubbles: true }));
            } else {
              inputEl.innerText = promptText;
              inputEl.dispatchEvent(new Event("input", { bubbles: true }));
            }

            // Find send button and click
            setTimeout(() => {
              const sendBtn = document.querySelector("button:has(svg), button[type='submit']");
              if (sendBtn) sendBtn.click();
            }, 500);
          }
        },
        args: [nextPrompt]
      }).then(() => {
        // Update input with remaining prompts
        batchInput.value = remainingPrompts;
        updatePromptCount();
        chrome.storage.local.set({ batchPrompts: remainingPrompts });
      }).catch(err => {
        alert("Error sending prompt: " + err.message);
      });
    });
  });
});
