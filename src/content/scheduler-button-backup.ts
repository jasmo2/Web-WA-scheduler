import { createApp } from "vue"
import SchedulerButton from "../components/SchedulerButton.vue"

// Native DOM utility functions to replace @testing-library/dom
function queryByRole(
  container: Element | Document,
  role: string,
  options?: { name?: string | RegExp }
): HTMLElement | null {
  const elements = container.querySelectorAll(`[role="${role}"]`)

  if (!options?.name) {
    return (elements[0] as HTMLElement) || null
  }

  for (const element of elements) {
    const ariaLabel = element.getAttribute("aria-label")
    const textContent = element.textContent?.trim()
    const title = element.getAttribute("title")

    const searchText =
      options.name instanceof RegExp
        ? options.name
        : new RegExp(options.name, "i")

    if (
      (ariaLabel && searchText.test(ariaLabel)) ||
      (textContent && searchText.test(textContent)) ||
      (title && searchText.test(title))
    ) {
      return element as HTMLElement
    }
  }

  return null
}

function getByRole(
  container: Element | Document,
  role: string,
  options?: { name?: string | RegExp }
): HTMLElement {
  const element = queryByRole(container, role, options)
  if (!element) {
    throw new Error(
      `Unable to find element with role "${role}"${
        options?.name ? ` and name "${options.name}"` : ""
      }`
    )
  }
  return element
}

// Playwright-inspired selectors for better element finding
function getByTestId(
  container: Element | Document,
  testId: string
): HTMLElement | null {
  return (
    (container.querySelector(`[data-testid="${testId}"]`) as HTMLElement) ||
    null
  )
}

function getByText(
  container: Element | Document,
  text: string | RegExp
): HTMLElement | null {
  const elements = container.querySelectorAll("*")
  const searchText = text instanceof RegExp ? text : new RegExp(text, "i")

  for (const element of elements) {
    if (element.textContent && searchText.test(element.textContent.trim())) {
      return element as HTMLElement
    }
  }
  return null
}

function waitFor<T>(
  callback: () => T,
  options: { timeout?: number } = {}
): Promise<T> {
  const timeout = options.timeout || 1000
  const interval = 50
  let elapsed = 0

  return new Promise((resolve, reject) => {
    const check = () => {
      try {
        const result = callback()
        if (result) {
          resolve(result)
          return
        }
      } catch (error) {
        // Continue trying
      }

      elapsed += interval
      if (elapsed >= timeout) {
        reject(new Error(`Timeout after ${timeout}ms`))
        return
      }

      setTimeout(check, interval)
    }

    check()
  })
}

// Helper function to create and dispatch native events with enhanced WhatsApp compatibility
function dispatchNativeEvent(
  element: HTMLElement,
  eventType: string,
  eventData?: any
) {
  let event: Event

  if (eventType === "input") {
    // For input events, we need to properly simulate typing
    event = new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: eventData?.target?.textContent || eventData?.target?.value,
    })

    if (eventData?.target?.value !== undefined) {
      ;(element as any).value = eventData.target.value
    }
    if (eventData?.target?.textContent !== undefined) {
      element.textContent = eventData.target.textContent
    }
    if (eventData?.target?.innerText !== undefined) {
      element.innerText = eventData.target.innerText
    }
  } else if (eventType === "change") {
    event = new Event("change", { bubbles: true, cancelable: true })
    if (eventData?.target?.value !== undefined) {
      ;(element as any).value = eventData.target.value
    }
  } else if (eventType === "click") {
    // Enhanced click event with proper mouse coordinates
    const rect = element.getBoundingClientRect()
    event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      button: 0,
    })
  } else if (
    eventType === "keydown" ||
    eventType === "keyup" ||
    eventType === "keypress"
  ) {
    event = new KeyboardEvent(eventType, {
      bubbles: true,
      cancelable: true,
      key: eventData?.key || "Enter",
      code: eventData?.code || "Enter",
      ...eventData,
    })
  } else {
    event = new Event(eventType, { bubbles: true, cancelable: true })
  }

  // Focus the element before dispatching events for better compatibility
  if (eventType === "input" || eventType === "change") {
    element.focus()
  }

  element.dispatchEvent(event)

  // For contenteditable elements, trigger additional events that WhatsApp might be listening for
  if (
    element.isContentEditable &&
    (eventType === "input" || eventType === "change")
  ) {
    element.dispatchEvent(new Event("textInput", { bubbles: true }))
    element.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true })
    )
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "sendScheduledMessage") {
    console.log("TCL ~ Received scheduled message:", request.data)
    sendWhatsAppMessage(request.data).then(() => {
      console.log("TCL ~ Successfully sent scheduled message")
      sendResponse({ success: true })
    })
    // .catch((error: { message: any }) => {
    //   console.log("TCL ~ Failed to send scheduled message:", error)
    //   sendResponse({ success: false, error: error.message })
    // })
    return true
  }
})

interface MessageData {
  recipient: string
  message: string
}

// Refactored the function to improve readability and maintainability
async function sendWhatsAppMessage({ recipient, message }: MessageData) {
  // try {
  console.log(
    "TCL ~ Starting to send message to:",
    recipient,
    "with content:",
    message.substring(0, 50) + "..."
  )

  // Step 1: First, try to use the search input to navigate to the correct chat
  const searchInput = queryByRole(document.body, "textbox", {
    name: "Search input textbox",
  }) as HTMLElement

  if (searchInput) {
    console.log("TCL ~ sendWhatsAppMessage ~ searchInput:", searchInput)
    // Clear existing content and type the recipient name
    searchInput.textContent = recipient
    dispatchNativeEvent(searchInput, "input", {
      target: { textContent: recipient },
    })
    dispatchNativeEvent(searchInput, "change", { target: { value: recipient } })

    console.log("TCL ~ sendWhatsAppMessage ~ fireEvent")

    // Wait for search results and click the contact
    // try {
    console.log("TCL ~ Waiting for contact to appear in search results...")
    const contact = await waitFor(
      () => getByRole(document.body, "listitem", { name: recipient }),
      { timeout: 3000 }
    )
    console.log("TCL ~ Found contact, clicking...")
    dispatchNativeEvent(contact, "click")

    // Wait for chat to load
    console.log("TCL ~ Waiting for chat to load...")
    await new Promise((resolve) => setTimeout(resolve, 1500))
    // } catch (searchError) {
    // console.log(
    //   "TCL ~ Primary search failed, will try fallback method:",
    //   searchError
    // )
    // Continue to fallback method below
    // }
  } else {
    console.log(
      "TCL ~ Primary search input not found, will try fallback method"
    )
  }

  // Step 2: Check if we're now in the correct chat
  const currentChatHeader = document.querySelector(
    "#main > header > div > div > div"
  )
  const currentChatName = currentChatHeader?.textContent?.trim()
  console.log(
    "TCL ~ Current chat name:",
    currentChatName,
    "| Expected:",
    recipient
  )

  if (currentChatName === recipient) {
    console.log("TCL ~ Already in correct chat, proceeding to send message")
    // Successfully in correct chat
  } else {
    console.log("TCL ~ Not in correct chat, trying fallback search method")
    // Fallback: Try the original search method
    const fallbackSearchInput = queryByRole(document.body, "textbox", {
      name: /search/i,
    })

    if (!fallbackSearchInput) {
      throw new Error(
        `Could not navigate to chat: ${recipient}. Please ensure the contact exists.`
      )
    }

    console.log("TCL ~ Found fallback search input, searching for:", recipient)
    fallbackSearchInput.focus()
    dispatchNativeEvent(fallbackSearchInput, "change", {
      target: { value: recipient },
    })

    // Wait for the contact to appear and click it
    console.log("TCL ~ Waiting for contact in fallback search...")
    const contact = await waitFor(
      () => getByRole(document.body, "listitem", { name: recipient }),
      { timeout: 5000 }
    )

    console.log("TCL ~ Found contact in fallback search, clicking...")
    dispatchNativeEvent(contact, "click")

    // Wait for chat to load
    console.log("TCL ~ Waiting for chat to load after fallback...")
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Final verification
    const finalChatHeader = document.querySelector(
      "#main > header > div > div > div"
    )
    const finalChatName = finalChatHeader?.textContent?.trim()
    console.log(
      "TCL ~ Final chat verification - Expected:",
      recipient,
      "| Found:",
      finalChatName
    )

    if (finalChatName !== recipient) {
      throw new Error(
        `Failed to navigate to chat: ${recipient}. Expected: ${recipient}, Found: ${finalChatName}`
      )
    }
    console.log("TCL ~ Successfully navigated to correct chat")
  }

  // Step 3: Locate and interact with the message input
  console.log("TCL ~ Looking for message input...")
  const mainChatArea = document.querySelector("#main") as HTMLElement
  if (!mainChatArea) throw new Error("Main chat area not found")

  // Try multiple selectors for message input
  let messageInput = mainChatArea.querySelector<HTMLDivElement>(
    'div[contenteditable="true"]'
  )

  if (!messageInput) {
    console.log(
      "TCL ~ Primary message input not found, trying alternative selectors..."
    )
    // Try alternative selector
    messageInput = mainChatArea.querySelector<HTMLDivElement>(
      '[data-testid="conversation-compose-box-input"]'
    )
  }

  if (!messageInput) {
    // Try another alternative
    messageInput = mainChatArea.querySelector<HTMLDivElement>(
      'div[role="textbox"]'
    )
  }

  if (!messageInput) throw new Error("Message input not found")

  console.log("TCL ~ Found message input, typing message...")
  messageInput.focus()

  // Clear existing content and set new message - try multiple methods
  messageInput.textContent = message
  messageInput.innerText = message

  // Trigger input events
  dispatchNativeEvent(messageInput, "input", {
    target: { textContent: message, innerText: message, value: message },
  })
  dispatchNativeEvent(messageInput, "change", {
    target: { value: message },
  })

  // Wait a moment for the message to be processed
  console.log("TCL ~ Waiting for message to be processed...")
  await new Promise((resolve) => setTimeout(resolve, 800))

  // Step 4: Locate and click the send button
  console.log("TCL ~ Looking for send button...")
  const sendButton =
    mainChatArea.querySelector('[data-testid="send"]') ||
    mainChatArea.querySelector('[data-icon="send"]') ||
    queryByRole(mainChatArea, "button", { name: /send/i })

  if (!sendButton) throw new Error("Send button not found")

  console.log("TCL ~ Found send button, clicking...")
  dispatchNativeEvent(sendButton as HTMLElement, "click")

  console.log("TCL ~ Message sent successfully!")
  return Promise.resolve(true)
  // } catch (error) {
  //   console.log("TCL ~ Failed to send WhatsApp message:", error)
  //   return Promise.reject(error)
  // }
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
