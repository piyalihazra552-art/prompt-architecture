/**
 * Dola AI 30s Studio Pro - In-Page Network Interceptor
 * Runs in the main webpage context to hook fetch and XHR.
 */
(function () {
  console.log("%c[Dola 30s Studio Pro] Interceptor Loaded!", "background: #6366f1; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;");

  // State
  window.__DOLA_STUDIO_STATE__ = {
    direct30sEnabled: true,
    autoExtendEnabled: true,
    autoDownloadEnabled: false,
    currentStep: 0,
    targetDuration: 30
  };

  // Listen for configuration updates from content script
  window.addEventListener("DOLA_UPDATE_STUDIO_CONFIG", function (event) {
    if (event.detail) {
      window.__DOLA_STUDIO_STATE__ = { ...window.__DOLA_STUDIO_STATE__, ...event.detail };
      console.log("[Dola 30s Studio] Config updated:", window.__DOLA_STUDIO_STATE__);
    }
  });

  // Helper to modify video request payload
  function modifyVideoPayload(bodyStr) {
    try {
      let data = JSON.parse(bodyStr);
      let modified = false;

      // Check for duration fields
      const durationKeys = ["duration", "video_duration", "duration_seconds", "seconds", "length", "time_limit"];
      for (const key of durationKeys) {
        if (key in data) {
          console.log(`[Dola 30s Studio] Found duration key '${key}':`, data[key]);
          if (typeof data[key] === "number") {
            data[key] = 30;
          } else if (typeof data[key] === "string") {
            data[key] = data[key].includes("s") ? "30s" : "30";
          }
          modified = true;
        }
      }

      // If it looks like a video generation request without explicit duration key, inject duration: 30
      if (!modified && (data.model || data.prompt || data.action || data.ratio || data.aspect_ratio)) {
        data.duration = 30;
        data.video_duration = 30;
        modified = true;
      }

      if (modified) {
        console.log("%c[Dola 30s Studio] Payload successfully modified to 30s:", "color: #10b981; font-weight: bold;", data);
        window.dispatchEvent(new CustomEvent("DOLA_NOTIFY_EVENT", {
          detail: { type: "info", message: "🚀 30s duration parameter injected into API request!" }
        }));
        return JSON.stringify(data);
      }
    } catch (e) {
      // Not a JSON payload or parsing failed, return unchanged
    }
    return bodyStr;
  }

  // 1. Intercept window.fetch
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    let [resource, config] = args;

    try {
      const url = typeof resource === "string" ? resource : (resource ? resource.url : "");
      
      if (window.__DOLA_STUDIO_STATE__.direct30sEnabled && config && config.body) {
        // Look for video, generate, chat, or seedance requests
        const isTargetEndpoint = url.includes("video") || 
                                 url.includes("generate") || 
                                 url.includes("chat") || 
                                 url.includes("creation") || 
                                 url.includes("ai") || 
                                 url.includes("task");

        if (isTargetEndpoint && typeof config.body === "string") {
          config.body = modifyVideoPayload(config.body);
        }
      }
    } catch (err) {
      console.warn("[Dola 30s Studio] Fetch intercept error:", err);
    }

    try {
      const response = await originalFetch.apply(this, args);

      // Clone response to inspect status
      if (response && response.status) {
        if (response.status >= 400 && response.status <= 499) {
          // If direct 30s caused a rejection, inform content script
          window.dispatchEvent(new CustomEvent("DOLA_NOTIFY_EVENT", {
            detail: { 
              type: "warning", 
              message: "⚠️ Server rejected 30s direct parameter. Switching to Auto-Extend Chaining Mode..." 
            }
          }));
          window.dispatchEvent(new CustomEvent("DOLA_FALLBACK_TO_AUTO_EXTEND"));
        } else if (response.status === 200 || response.status === 201) {
          window.dispatchEvent(new CustomEvent("DOLA_NOTIFY_EVENT", {
            detail: { type: "success", message: "✨ Generation request accepted by Dola!" }
          }));
        }
      }

      return response;
    } catch (fetchErr) {
      throw fetchErr;
    }
  };

  // 2. Intercept XMLHttpRequest (XHR)
  const originalXHR = window.XMLHttpRequest;
  function CustomXHR() {
    const xhr = new originalXHR();
    let requestUrl = "";
    let requestMethod = "";

    const origOpen = xhr.open;
    xhr.open = function (method, url, ...rest) {
      requestMethod = method;
      requestUrl = url;
      return origOpen.apply(this, [method, url, ...rest]);
    };

    const origSend = xhr.send;
    xhr.send = function (body) {
      if (window.__DOLA_STUDIO_STATE__.direct30sEnabled && typeof body === "string" && requestMethod.toUpperCase() === "POST") {
        body = modifyVideoPayload(body);
      }
      return origSend.apply(this, [body]);
    };

    return xhr;
  }
  window.XMLHttpRequest = CustomXHR;

})();
