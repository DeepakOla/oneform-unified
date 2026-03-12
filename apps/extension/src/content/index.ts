import '../styles/globals.css';

console.log('OneForm Extension Content Script Loaded.');

// Basic placeholder for the migrated content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PING') {
    sendResponse({ status: 'PONG' });
  }
  return true;
});
