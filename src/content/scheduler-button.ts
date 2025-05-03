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

// Refactored the function to improve readability and maintainability
async function sendWhatsAppMessage({ recipient, message }: MessageData) {
  console.log(`Sending scheduled message to ${recipient}`)

  try {
    // Step 1: Locate and interact with the search box
    const searchInput = queryByRole(document.body, "textbox", {
      name: /search or start new chat/i,
    })
    if (!searchInput) throw new Error("Search input not found")

    searchInput.focus()
    fireEvent.change(searchInput, { target: { value: recipient } })

    // Step 2: Wait for the contact to appear and click it
    const contact = await waitFor(() =>
      getByRole(document.body, "listitem", { name: recipient })
    )
    if (!contact) throw new Error("Contact not found")

    fireEvent.click(contact)

    // Step 3: Locate and interact with the message input
    const mainChatArea = document.querySelector("#main") as HTMLElement
    if (!mainChatArea) throw new Error("Main chat area not found")

    const messageInput = mainChatArea.querySelector<HTMLDivElement>(
      'div[contenteditable="true"]'
    )
    if (!messageInput) throw new Error("Message input not found")

    messageInput.focus()
    fireEvent.change(messageInput, { target: { value: message } })
    fireEvent.input(messageInput)

    // Step 4: Locate and click the send button
    const sendButton =
      mainChatArea.querySelector('[data-testid="send"]') ||
      mainChatArea.querySelector('[data-icon="send"]') ||
      queryByRole(mainChatArea, "button", { name: /send/i })

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
