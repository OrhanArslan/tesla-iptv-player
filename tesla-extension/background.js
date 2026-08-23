/**
 * Tesla IPTV Video Bypass - Background Service Worker
 * Chrome Extension background script for managing bypass state
 */

let bypassEnabled = true;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['bypassEnabled'], (result) => {
    bypassEnabled = result.bypassEnabled !== undefined ? result.bypassEnabled : true;
    console.log('[TeslaBypass] Extension initialized, bypass:', bypassEnabled);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleBypass') {
    bypassEnabled = message.enabled;
    chrome.storage.sync.set({ bypassEnabled });
    console.log('[TeslaBypass] Bypass toggled:', bypassEnabled);
    sendResponse({ status: 'toggled', enabled: bypassEnabled });
  } else if (message.action === 'getStatus') {
    sendResponse({ enabled: bypassEnabled });
  }
  return true; // Keep message channel open for async response
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && bypassEnabled) {
    chrome.tabs.sendMessage(tabId, { action: 'startBypass' }).catch(() => {
      // Tab may not have content script loaded yet
    });
  }
});
