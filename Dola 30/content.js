/**
 * Dola AI 30s Studio Pro - Content Script
 * Handles UI modifications, dropdown injection, floating studio widget,
 * and auto-extend chaining automation.
 */
(function () {
  console.log("%c[Dola 30s Studio Pro] Content Script Initializing...", "background: #10b981; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;");

  // State Management
  const state = {
    direct30sEnabled: true,
    autoExtendEnabled: true,
    autoDownloadEnabled: false,
    currentStep: 0,
    maxStep: 3, // 10s -> 20s -> 30s
    isMinimised: false
  };

  // Load saved state from chrome storage if available
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["direct30sEnabled", "autoExtendEnabled", "autoDownloadEnabled"], (result) => {
      if (result.direct30sEnabled !== undefined) state.direct30sEnabled = result.direct30sEnabled;
      if (result.autoExtendEnabled !== undefined) state.autoExtendEnabled = result.autoExtendEnabled;
      if (result.autoDownloadEnabled !== undefined) state.autoDownloadEnabled = result.autoDownloadEnabled;
      updateWidgetUI();
      syncConfigWithPage();
    });
  }

  // 1. Inject inject.js into the Page World
  function injectPageScript() {
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL("inject.js");
    s.onload = function () {
      this.remove();
      syncConfigWithPage();
    };
    (document.head || document.documentElement).appendChild(s);
  }
  injectPageScript();

  // Sync state to the page context
  function syncConfigWithPage() {
    window.dispatchEvent(new CustomEvent("DOLA_UPDATE_STUDIO_CONFIG", {
      detail: {
        direct30sEnabled: state.direct30sEnabled,
        autoExtendEnabled: state.autoExtendEnabled,
        autoDownloadEnabled: state.autoDownloadEnabled
      }
    }));
  }

  // 2. Toast Notification System
  function showToast(message, type = "info") {
    let container = document.getElementById("dola-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "dola-toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `dola-toast ${type}`;
    
    let icon = "⚡";
    if (type === "success") icon = "✅";
    if (type === "warning") icon = "⚠️";

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-15px) scale(0.95)";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Listen for notifications from inject.js
  window.addEventListener("DOLA_NOTIFY_EVENT", (e) => {
    if (e.detail) {
      showToast(e.detail.message, e.detail.type || "info");
    }
  });

  window.addEventListener("DOLA_FALLBACK_TO_AUTO_EXTEND", () => {
    state.autoExtendEnabled = true;
    updateWidgetUI();
    syncConfigWithPage();
  });

  // 3. Dropdown Injection for Native Duration Popover
  function checkAndInjectDurationMenu() {
    // Look for popup/popover elements
    const popups = document.querySelectorAll('div[role="dialog"], div[role="menu"], div[class*="popover"], div[class*="dropdown"], div[class*="popup"]');
    
    popups.forEach((popup) => {
      // Find 10s item
      const elements = Array.from(popup.querySelectorAll("div, button, li, span"));
      const item10s = elements.find(el => {
        const text = el.textContent.trim();
        return text === "10s" || text === "10 s" || text.startsWith("10s");
      });

      if (item10s && !popup.querySelector("#dola-injected-30s-option")) {
        // Target container
        const targetContainer = item10s.closest("div")?.parentElement || popup;
        
        const option30s = document.createElement("div");
        option30s.id = "dola-injected-30s-option";
        option30s.className = "dola-30s-injected-item";
        option30s.innerHTML = `
          <span>30s ⚡ Unlocked</span>
          <span class="dola-30s-injected-badge">PRO</span>
        `;

        option30s.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();

          // Mark active
          popup.querySelectorAll(".dola-30s-injected-item, div, button").forEach(el => el.classList.remove("active"));
          option30s.classList.add("active");

          // Enable direct 30s
          state.direct30sEnabled = true;
          syncConfigWithPage();

          // Update trigger button label in the input bar
          updateInputBarDurationLabel("30s");

          showToast("⚡ 30-Second Duration selected! Direct 30s unlock active.", "success");

          // Close popup by simulating escape or outside click
          setTimeout(() => {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape" }));
          }, 200);
        });

        // Insert after 10s option container
        const itemRow = item10s.closest('[role="menuitem"], div[class*="item"]') || item10s;
        itemRow.parentNode.insertBefore(option30s, itemRow.nextSibling);
        console.log("[Dola 30s Studio] Successfully injected 30s option into duration dropdown!");
      }
    });
  }

  function updateInputBarDurationLabel(text) {
    // Find button with 5s or 10s in the input toolbar
    const buttons = document.querySelectorAll("button, div[role='button']");
    buttons.forEach((btn) => {
      if (btn.textContent.includes("5s") || btn.textContent.includes("10s")) {
        // Keep icons, replace duration text
        btn.innerHTML = btn.innerHTML.replace(/(5s|10s)/g, text);
      }
    });
  }

  // 4. Floating Studio Widget UI
  function createStudioWidget() {
    if (document.getElementById("dola-30s-studio-widget")) return;

    const widget = document.createElement("div");
    widget.id = "dola-30s-studio-widget";
    widget.innerHTML = `
      <div class="studio-header" id="dola-studio-drag-header">
        <div class="studio-title-box">
          <span class="studio-icon">⚡</span>
          <span class="studio-title">Dola 30s Studio</span>
          <span class="studio-tag">Seedance 2.5</span>
        </div>
        <button class="studio-toggle-btn" id="dola-studio-min-btn" title="Minimize/Maximize">_</button>
      </div>

      <div class="studio-body">
        <!-- Direct 30s Unlock Toggle -->
        <div class="studio-row">
          <div class="studio-row-label">
            <span class="studio-row-title">Direct 30s Unlock</span>
            <span class="studio-row-desc">Injects 30s in Seedance 2.5 API payload</span>
          </div>
          <label class="studio-switch">
            <input type="checkbox" id="dola-toggle-direct30s" ${state.direct30sEnabled ? "checked" : ""}>
            <span class="studio-slider"></span>
          </label>
        </div>

        <!-- Auto-Extend Chaining Mode -->
        <div class="studio-row">
          <div class="studio-row-label">
            <span class="studio-row-title">Auto-Extend Chaining</span>
            <span class="studio-row-desc">Auto-clicks Extend (10s ➔ 20s ➔ 30s)</span>
          </div>
          <label class="studio-switch">
            <input type="checkbox" id="dola-toggle-autoextend" ${state.autoExtendEnabled ? "checked" : ""}>
            <span class="studio-slider"></span>
          </label>
        </div>

        <!-- Auto-Download Video -->
        <div class="studio-row">
          <div class="studio-row-label">
            <span class="studio-row-title">Auto Download 30s</span>
            <span class="studio-row-desc">Saves video automatically when 30s ready</span>
          </div>
          <label class="studio-switch">
            <input type="checkbox" id="dola-toggle-autodownload" ${state.autoDownloadEnabled ? "checked" : ""}>
            <span class="studio-slider"></span>
          </label>
        </div>

        <!-- Chaining Progress Bar -->
        <div class="studio-progress-box">
          <div class="studio-progress-header">
            <span>Progress:</span>
            <span class="studio-progress-status" id="dola-progress-text">Ready (0s / 30s)</span>
          </div>
          <div class="studio-progress-bar-bg">
            <div class="studio-progress-bar-fill" id="dola-progress-fill"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(widget);

    // Event Listeners for Toggles
    const toggleDirect = document.getElementById("dola-toggle-direct30s");
    toggleDirect.addEventListener("change", (e) => {
      state.direct30sEnabled = e.target.checked;
      saveAndSyncState();
      showToast(state.direct30sEnabled ? "Direct 30s Unlock Enabled" : "Direct 30s Unlock Disabled");
    });

    const toggleExtend = document.getElementById("dola-toggle-autoextend");
    toggleExtend.addEventListener("change", (e) => {
      state.autoExtendEnabled = e.target.checked;
      saveAndSyncState();
      showToast(state.autoExtendEnabled ? "Auto-Extend Chaining Enabled" : "Auto-Extend Chaining Disabled");
    });

    const toggleDownload = document.getElementById("dola-toggle-autodownload");
    toggleDownload.addEventListener("change", (e) => {
      state.autoDownloadEnabled = e.target.checked;
      saveAndSyncState();
      showToast(state.autoDownloadEnabled ? "Auto Download Enabled" : "Auto Download Disabled");
    });

    const minBtn = document.getElementById("dola-studio-min-btn");
    minBtn.addEventListener("click", () => {
      state.isMinimised = !state.isMinimised;
      widget.classList.toggle("minimized", state.isMinimised);
      minBtn.textContent = state.isMinimised ? "+" : "_";
    });
  }

  function updateWidgetUI() {
    const toggleDirect = document.getElementById("dola-toggle-direct30s");
    const toggleExtend = document.getElementById("dola-toggle-autoextend");
    const toggleDownload = document.getElementById("dola-toggle-autodownload");

    if (toggleDirect) toggleDirect.checked = state.direct30sEnabled;
    if (toggleExtend) toggleExtend.checked = state.autoExtendEnabled;
    if (toggleDownload) toggleDownload.checked = state.autoDownloadEnabled;
  }

  function saveAndSyncState() {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        direct30sEnabled: state.direct30sEnabled,
        autoExtendEnabled: state.autoExtendEnabled,
        autoDownloadEnabled: state.autoDownloadEnabled
      });
    }
    syncConfigWithPage();
  }

  function updateProgress(step, seconds) {
    state.currentStep = step;
    const progressText = document.getElementById("dola-progress-text");
    const progressFill = document.getElementById("dola-progress-fill");

    if (progressText) {
      progressText.textContent = `Stage ${step}/${state.maxStep} (${seconds}s / 30s)`;
    }
    if (progressFill) {
      const pct = Math.min(100, Math.round((seconds / 30) * 100));
      progressFill.style.width = `${pct}%`;
    }
  }

  // 5. Auto-Extend Chaining Engine
  // Detects when a 10s video completes and automatically clicks "Extend" up to 30s
  function watchForAutoExtend() {
    if (!state.autoExtendEnabled) return;

    // Search for video cards in the chat/creation container
    const videoContainers = document.querySelectorAll('div[class*="video"], div[class*="message"], div[class*="creation"]');
    
    videoContainers.forEach((card) => {
      // Check if this card contains a completed video
      const videoEl = card.querySelector("video");
      if (videoEl && !card.dataset.dolaProcessed) {
        // Find extend button
        const buttons = Array.from(card.querySelectorAll("button, div[role='button']"));
        const extendBtn = buttons.find(b => {
          const t = b.textContent.toLowerCase();
          return t.includes("extend") || t.includes("continue") || b.getAttribute("aria-label")?.toLowerCase().includes("extend");
        });

        if (extendBtn && state.currentStep < state.maxStep) {
          card.dataset.dolaProcessed = "extending";
          state.currentStep++;
          const currentSeconds = state.currentStep * 10;
          updateProgress(state.currentStep, currentSeconds);

          showToast(`🔄 Auto-Extend triggered: Extending to ${currentSeconds}s...`, "info");
          
          setTimeout(() => {
            extendBtn.click();
            console.log(`[Dola 30s Studio] Triggered Extend click for step ${state.currentStep}`);
          }, 1500);

          if (state.currentStep >= state.maxStep) {
            card.dataset.dolaProcessed = "completed_30s";
            showToast("🎉 30-Second Full Video Completed!", "success");

            if (state.autoDownloadEnabled) {
              triggerVideoDownload(card, videoEl);
            }
          }
        }
      }
    });
  }

  function triggerVideoDownload(card, videoEl) {
    const downloadBtn = Array.from(card.querySelectorAll("button, a")).find(b => {
      const t = b.textContent.toLowerCase();
      return t.includes("download") || b.getAttribute("aria-label")?.toLowerCase().includes("download");
    });

    if (downloadBtn) {
      setTimeout(() => {
        downloadBtn.click();
        showToast("📥 30s Video Download Triggered!", "success");
      }, 2000);
    } else if (videoEl && videoEl.src) {
      const a = document.createElement("a");
      a.href = videoEl.src;
      a.download = `Dola_30s_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast("📥 30s Video Saved to Downloads!", "success");
    }
  }

  // 6. Main Observer Loop
  const mainObserver = new MutationObserver(() => {
    checkAndInjectDurationMenu();
    watchForAutoExtend();
  });

  // Start observing when body is ready
  function init() {
    createStudioWidget();
    checkAndInjectDurationMenu();
    mainObserver.observe(document.body, { childList: true, subtree: true });
    console.log("[Dola 30s Studio Pro] Observer Active & Monitoring!");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
