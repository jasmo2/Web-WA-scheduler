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
    console.log("TCL ~ Received scheduled message:", request.data)
    sendWhatsAppMessage(request.data)
      .then(() => {
        console.log("TCL ~ Successfully sent scheduled message")
        sendResponse({ success: true })
      })
      .catch((error: { message: any }) => {
        console.log("TCL ~ Failed to send scheduled message:", error)
        sendResponse({ success: false, error: error.message })
      })
    return true
  }
})

interface MessageData {
  recipient: string
  message: string
}

// Refactored the function to improve readability and maintainability
async function sendWhatsAppMessage({ recipient, message }: MessageData) {
  try {
    console.log(
      "TCL ~ Starting to send message to:",
      recipient,
      "with content:",
      message
    )

    // Step 2: Check if we're already in the correct chat
    const currentChatHeader = document.querySelector(
      "#main > header > div > div > div"
    )
    if (
      currentChatHeader &&
      currentChatHeader.textContent?.trim() === recipient
    ) {
      console.log("TCL ~ Already in correct chat, skipping search")
      // Skip to message sending
    } else {
      console.log("TCL ~ Need to navigate to chat:", recipient)

      // Step 3: Locate and interact with the search box
      const searchInput = queryByRole(document.body, "textbox", {
        name: /search or start new chat/i,
      })
      if (!searchInput) throw new Error("Search input not found")

      console.log("TCL ~ Found search input, searching for:", recipient)
      searchInput.focus()
      fireEvent.change(searchInput, { target: { value: recipient } })

      // Step 4: Wait for the contact to appear and click it
      console.log("TCL ~ Waiting for contact to appear...")
      const contact = await waitFor(() =>
        getByRole(document.body, "listitem", { name: recipient })
      )
      if (!contact) throw new Error("Contact not found")

      console.log("TCL ~ Found contact, clicking...")
      fireEvent.click(contact)

      // Wait a moment for chat to load
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    // Step 5: Locate and interact with the message input
    console.log("TCL ~ Looking for message input...")
    const mainChatArea = document.querySelector("#main") as HTMLElement
    if (!mainChatArea) throw new Error("Main chat area not found")

    const messageInput = mainChatArea.querySelector<HTMLDivElement>(
      'div[contenteditable="true"]'
    )
    if (!messageInput) throw new Error("Message input not found")

    console.log("TCL ~ Found message input, typing message...")
    messageInput.focus()

    // Clear existing content and set new message
    messageInput.textContent = message
    fireEvent.input(messageInput, { target: { textContent: message } })

    // Wait a moment for the message to be processed
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Step 6: Locate and click the send button
    console.log("TCL ~ Looking for send button...")
    const sendButton =
      mainChatArea.querySelector('[data-testid="send"]') ||
      mainChatArea.querySelector('[data-icon="send"]') ||
      queryByRole(mainChatArea, "button", { name: /send/i })

    if (!sendButton) throw new Error("Send button not found")

    console.log("TCL ~ Found send button, clicking...")
    fireEvent.click(sendButton)

    console.log("TCL ~ Message sent successfully!")
    return Promise.resolve(true)
  } catch (error) {
    console.log("TCL ~ Failed to send WhatsApp message:", error)
    return Promise.reject(error)
  }
}

const observer = new MutationObserver(() => {
  const speechButton = document
    .querySelector('[data-icon="ptt"]')
    ?.closest("button")

  if (
    speechButton &&
    !speechButton.parentElement?.querySelector(".scheduler-container")
  ) {
    const container = document.createElement("div")
    container.className = "scheduler-container" // Add a class to avoid duplicate injections
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
})

// Start observing the DOM for changes
observer.observe(document.body, { childList: true, subtree: true })
