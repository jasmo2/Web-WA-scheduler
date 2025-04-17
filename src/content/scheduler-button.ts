import { createApp } from "vue"
import SchedulerButton from "../components/SchedulerButton.vue"

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sendScheduledMessage") {
    sendWhatsAppMessage(request.data)
      .then(() => sendResponse({ success: true }))
      .catch((error: { message: any }) =>
        sendResponse({ success: false, error: error.message })
      )
    return true
  }
})

interface MessageData {
  recipient: string
  message: string
}

// Function to send a WhatsApp message
function sendWhatsAppMessage({ recipient, message }: MessageData) {
  console.log(`Sending scheduled message to ${recipient}`)

  try {
    // Step 1: Find the search box in the side panel
    // Find the search input in different ways (WhatsApp Web changes its structure often)
    let searchInput: HTMLElement | null = document.querySelector(
      '#side div[contenteditable="true"]'
    )
    if (!searchInput) throw new Error("Side searchInput panel not found")

    // Clear any existing text
    searchInput.textContent = ""
    searchInput.focus()

    // Insert the recipient name
    document.execCommand("insertText", false, recipient)
    searchInput.dispatchEvent(new Event("change", { bubbles: true }))

    // Step 2: Click on the first chat result (try multiple selectors)
    const contactToBeClick = document.querySelector(
      '#pane-side div[role="listitem"]:nth-of-type(2)'
    )

    if (!contactToBeClick) throw new Error("chatResult person not found")

    // Step 3: Find the main chat area
    const main = document.querySelector("#main")
    if (!main) throw new Error("Main chat area not found")

    // Find the message input - try multiple selectors
    let messageInput: HTMLElement | null = main.querySelector(
      'div[contenteditable="true"]'
    )
    if (!messageInput) throw new Error("messageInput chat area not found")

    setTimeout(() => {
      const sendButton =
        main.querySelector(`[data-testid="send"]`) ||
        main.querySelector(`[data-icon="send"]`)

      if (sendButton) {
        ;(sendButton as HTMLElement).click()
      }
    }, 100)

    messageInput.focus()
    document.execCommand("insertText", false, message)
    messageInput.dispatchEvent(new Event("change", { bubbles: true }))
    messageInput.dispatchEvent(new Event("input", { bubbles: true }))

    // Find and click send button
    let sendButton: HTMLElement | null = document.querySelector(
      'button[data-testid="compose-btn-send"]'
    )

    if (!sendButton) {
      sendButton = main.querySelector('button[data-icon="send"]')

      if (!sendButton) {
        sendButton = document.querySelector("button.send-button")

        if (!sendButton) {
          throw new Error("Send button not found")
        }
      }
    }

    sendButton.click()
    console.log("Message sent successfully!")

    return Promise.resolve(true)
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error)
    return Promise.reject(error)
  }
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
