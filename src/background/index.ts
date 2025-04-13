console.log("Hello Background Service Worker!")

chrome.runtime.onInstalled.addListener(() => {
  console.log("Hello Extension Installed!")
})
