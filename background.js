const DASH = chrome.runtime.getURL("dashboard.html");

// Toolbar click: put the current page's URL first, then show the wall full screen.
chrome.action.onClicked.addListener(async (tab) => {
  if (/^https?:/i.test(tab.url || "")) {
    const { urls = [] } = await chrome.storage.local.get("urls");
    await chrome.storage.local.set({ urls: [tab.url, ...urls.filter((u) => u !== tab.url)] });
  }
  const [existing] = await chrome.tabs.query({ url: DASH });
  const dash = existing
    ? await chrome.tabs.update(existing.id, { active: true })
    : await chrome.tabs.create({ url: DASH });
  await chrome.windows.update(dash.windowId, { focused: true, state: "fullscreen" });
});

// Many sites refuse to be framed. Strip those headers, but only for frames
// that are loaded from this extension's own pages.
async function installRules() {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1, 2],
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: "modifyHeaders",
          responseHeaders: [
            { header: "x-frame-options", operation: "remove" },
            { header: "content-security-policy", operation: "remove" },
            { header: "content-security-policy-report-only", operation: "remove" }
          ]
        },
        condition: {
          resourceTypes: ["sub_frame"],
          initiatorDomains: [chrome.runtime.id]
        }
      },
      {
        // YouTube's embed player fails with Error 153 when the embedder sends
        // no usable Referer (extension pages don't). Supply one.
        id: 2,
        priority: 1,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            { header: "referer", operation: "set", value: "https://www.youtube.com/" }
          ]
        },
        condition: {
          regexFilter: "^https://www[.]youtube([-]nocookie)?[.]com/embed/",
          resourceTypes: ["sub_frame"],
          initiatorDomains: [chrome.runtime.id]
        }
      }
    ]
  });
}

chrome.runtime.onInstalled.addListener(installRules);
chrome.runtime.onStartup.addListener(installRules);
