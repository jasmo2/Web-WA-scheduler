import { createApp } from "vue"
import SchedulerButton from "../components/SchedulerButton.vue"
import {
  queryByRole,
  getByRole,
  fireEvent,
  waitFor,
} from "@testing-library/dom"

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
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
async function sendWhatsAppMessage({ recipient, message }: MessageData) {
  console.log(`Sending scheduled message to ${recipient}`)

  try {
    // Step 1: Find and interact with the search box
    let searchInput = queryByRole(document.body, "textbox", {
      name: /search or start new chat/i, // Adjust label as needed
    })
    if (!searchInput) throw new Error("Side search input panel not found")

    searchInput.focus()
    fireEvent.change(searchInput, { target: { value: recipient } })

    // Step 2: Wait for the contact to appear in the list and click it
    const contactToBeClick = await waitFor(
      () => getByRole(document.body, "listitem", { name: recipient }), // Adjust query as needed
      { timeout: 5000 } // Adjust timeout as necessary
    )

    if (!contactToBeClick) throw new Error("Chat result person not found")

    fireEvent.click(contactToBeClick)

    // Step 3: Find and interact with the message input
    const main = document.querySelector("#main") as HTMLDivElement
    if (!main) throw new Error("Main chat area not found")

    // Use a more specific selector to target the message input
    let messageInput = main.querySelector<HTMLDivElement>(
      'div[contenteditable="true"]'
    )
    if (!messageInput) throw new Error("Message input chat area not found")

    messageInput.focus()
    fireEvent.change(messageInput, { target: { value: message } })
    fireEvent.input(messageInput) // May be needed to trigger internal updates

    // Step 4: Find and click the send button
    let sendButton = main.querySelector('[data-testid="send"]') as HTMLElement
    if (!sendButton) {
      sendButton = main.querySelector('[data-icon="send"]') as HTMLElement
    }
    if (!sendButton) {
      // Try to find the button that has an SVG icon inside it
      const sendIconContainer = main.querySelector('span[data-icon="send"]')
      if (sendIconContainer) {
        sendButton = sendIconContainer.closest("button") as HTMLElement
      }
    }
    if (!sendButton) {
      // Fall back to role queries as last resort
      sendButton = queryByRole(main, "button", { name: /send/i })!
    }

    if (!sendButton) throw new Error("Send button not found")

    fireEvent.click(sendButton)
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
