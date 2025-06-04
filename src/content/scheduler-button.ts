import { createApp } from "vue"
import SchedulerButton from "../components/SchedulerButton.vue"
import { WhatsAppPage } from "../Models/WhatsappPage"
import { ElementLocator } from "../Models/ElementLocator"

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

// Playwright-inspired WhatsApp automation
async function sendWhatsAppMessage({ recipient, message }: MessageData) {
  try {
    console.log(
      "TCL ~ Starting to send message to:",
      recipient,
      "with content:",
      message.substring(0, 50) + "..."
    )

    const page = new WhatsAppPage()
    await page.waitForLoadState()

    // Step 1: Search for the contact using Playwright-style selectors
    console.log("TCL ~ Looking for search input...")

    // Try multiple search input selectors with consistent timeout
    let searchInput: ElementLocator | null = null
    const searchTimeout = 3000

    // Try different selectors in order of preference
    const searchSelectors = [
      () => page.getByRole("textbox", { name: /search/i }),
      () => page.getByPlaceholder("Search or start new chat"),
      () => page.locator('[data-testid="chat-list-search"] input'),
      () => page.locator('div[contenteditable="true"][data-tab="3"]'),
    ]

    for (const selectorFn of searchSelectors) {
      try {
        const candidate = selectorFn()
        await candidate.waitFor({ timeout: searchTimeout })
        searchInput = candidate
        break
      } catch (error) {
        console.log("TCL ~ Search selector failed, trying next...")
        continue
      }
    }

    if (!searchInput) {
      throw new Error("Could not find search input element")
    }

    console.log("TCL ~ Found search input, searching for:", recipient)
    await searchInput.fill(recipient)

    // Step 2: Wait for and click the contact
    console.log("TCL ~ Waiting for contact to appear in search results...")
    const contactLocator = page.getByRole("listitem", {
      name: new RegExp(recipient, "i"),
    })
    await contactLocator.click({ timeout: 5000 })

    // Step 3: Wait for chat to load and verify we're in the correct chat
    console.log("TCL ~ Waiting for chat to load...")
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const chatHeader = page.locator(
      '#main header [data-testid="conversation-info-header"]'
    )
    try {
      await chatHeader.waitFor({ timeout: 3000 })
      const headerElement = await chatHeader.waitFor()
      const currentChatName = headerElement.textContent?.trim()

      console.log(
        "TCL ~ Current chat name:",
        currentChatName,
        "| Expected:",
        recipient
      )

      if (!currentChatName?.includes(recipient)) {
        throw new Error(
          `Failed to navigate to correct chat. Expected: ${recipient}, Found: ${currentChatName}`
        )
      }
    } catch (error) {
      console.log(
        "TCL ~ Warning: Could not verify chat header, proceeding anyway"
      )
    }

    // Step 4: Find and interact with the message input
    console.log("TCL ~ Looking for message input...")

    let messageInput: ElementLocator | null = null
    const inputTimeout = 3000

    // Try different message input selectors in order of preference
    const inputSelectors = [
      () => page.getByRole("textbox", { name: /type a message/i }),
      () => page.locator('[data-testid="conversation-compose-box-input"]'),
      () => page.locator('#main div[contenteditable="true"]'),
      () => page.locator('div[role="textbox"]'),
    ]

    for (const selectorFn of inputSelectors) {
      try {
        const candidate = selectorFn()
        await candidate.waitFor({ timeout: inputTimeout })
        messageInput = candidate
        break
      } catch (error) {
        console.log("TCL ~ Message input selector failed, trying next...")
        continue
      }
    }

    if (!messageInput) {
      throw new Error("Could not find message input element")
    }

    console.log("TCL ~ Found message input, typing message...")
    await messageInput.fill(message)

    // Step 5: Wait a moment for the message to be processed
    console.log("TCL ~ Waiting for message to be processed...")
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Step 6: Find and click the send button
    console.log("TCL ~ Looking for send button...")

    let sendButton: ElementLocator | null = null
    const sendTimeout = 3000

    // Try different send button selectors in order of preference
    const sendSelectors = [
      () => page.getByTestId("send"),
      () => page.locator('[data-icon="send"]'),
      () => page.getByRole("button", { name: /send/i }),
      () => page.locator('button[aria-label*="Send"]'),
    ]

    for (const selectorFn of sendSelectors) {
      try {
        const candidate = selectorFn()
        await candidate.waitFor({ timeout: sendTimeout })
        sendButton = candidate
        break
      } catch (error) {
        console.log("TCL ~ Send button selector failed, trying next...")
        continue
      }
    }

    if (!sendButton) {
      throw new Error("Could not find send button element")
    }

    console.log("TCL ~ Found send button, clicking...")
    await sendButton.click()

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
    container.className = "scheduler-container"
    container.style.display = "inline-block"
    container.style.marginLeft = "8px"

    speechButton.parentElement?.appendChild(container)

    const app = createApp(SchedulerButton)
    app.config.globalProperties.$chrome = chrome
    app.mount(container)
  }
})

observer.observe(document.body, { childList: true, subtree: true })
