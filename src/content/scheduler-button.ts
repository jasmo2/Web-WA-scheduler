import { createApp } from "vue"
import SchedulerButton from "../components/SchedulerButton.vue"

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sendScheduledMessage") {
    sendWhatsAppMessage(request.data)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true // Keep the message channel open for async response
  }
})

interface MessageData {
  recipient: string
  message: string
}

// Function to send a WhatsApp message
async function sendWhatsAppMessage({ recipient, message }: MessageData) {
  console.log(`Sending scheduled message to ${recipient}`)

  // Step 1: Search for the recipient
  const searchBox = document.querySelector(
    'div[data-testid="chat-list-search"]'
  ) as HTMLElement
  if (!searchBox) throw new Error("Search box not found")

  searchBox.click()

  // Find the input within the search container
  const searchInput = document.querySelector(
    'div[data-testid="chat-list-search"] div[contenteditable="true"]'
  ) as HTMLElement
  if (!searchInput) throw new Error("Search input not found")

  // Clear any existing text
  searchInput.textContent = ""
  searchInput.focus()

  // Insert the recipient name
  document.execCommand("insertText", false, recipient)
  searchInput.dispatchEvent(new Event("change", { bubbles: true }))

  // Wait for search results
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Step 2: Click on the first chat result
  const chatResult = document.querySelector(
    'div[data-testid="cell-frame-title"]'
  ) as HTMLElement
  if (!chatResult) throw new Error("Chat not found for recipient: " + recipient)

  chatResult.click()

  // Wait for chat to load
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Step 3: Type and send the message
  const messageInput = document.querySelector(
    'div[data-testid="conversation-compose-box-input"]'
  ) as HTMLElement
  if (!messageInput) throw new Error("Message input not found")

  messageInput.focus()
  document.execCommand("insertText", false, message)
  messageInput.dispatchEvent(new Event("change", { bubbles: true }))

  // Wait for the message to be typed
  await new Promise((resolve) => setTimeout(resolve, 300))

  // Send the message
  const sendButton = document.querySelector(
    'button[data-testid="compose-btn-send"]'
  ) as HTMLElement
  if (!sendButton) throw new Error("Send button not found")

  sendButton.click()
  console.log("Message sent successfully!")

  return true
}

window.addEventListener("load", () => {
  const interval = setInterval(() => {
    const speechButton = document
      .querySelector('[data-icon="ptt"]')
      ?.closest("button")

    if (speechButton) {
      clearInterval(interval)

      const container = document.createElement("div")
      container.style.display = "inline-block"
      container.style.marginLeft = "8px" // Add spacing between the buttons

      // Insert the container next to the speech button
      speechButton.parentElement?.appendChild(container)

      // Mount the Vue component
      const app = createApp(SchedulerButton)

      // Make sure to inject the Chrome extension API
      app.config.globalProperties.$chrome = chrome

      app.mount(container)
    }
  }, 500)
})
