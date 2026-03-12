// OneForm Background Service Worker (MV3)
console.log('OneForm Service Worker initialized.');

chrome.runtime.onInstalled.addListener(() => {
  console.log('OneForm extension installed or updated.');
  // Initialize default state
  chrome.storage.local.set({ 
    user: null, 
    token: null,
    isInitialized: true 
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Received message:', request);
  
  if (request.type === 'GET_STATE') {
    chrome.storage.local.get(['user', 'token'], (result) => {
      sendResponse(result);
    });
    return true; // Keep channel open for async response
  }
  
  return false;
});
