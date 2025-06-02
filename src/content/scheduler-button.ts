import { createApp } from "vue"
import SchedulerButton from "../components/SchedulerButton.vue"

// Playwright-inspired Page class for WhatsApp automation
class WhatsAppPage {
  private page: Document

  constructor() {
    this.page = document
  }

  // Playwright-style locator methods
  getByRole(role: string, options?: { name?: string | RegExp }) {
    return new ElementLocator(this.page, `[role="${role}"]`, options)
  }

  getByTestId(testId: string) {
    return new ElementLocator(this.page, `[data-testid="${testId}"]`)
  }

  getByText(text: string | RegExp) {
    return new ElementLocator(this.page, "*", { text })
  }

  getByPlaceholder(placeholder: string) {
    return new ElementLocator(this.page, `[placeholder*="${placeholder}"]`)
  }

  locator(selector: string) {
    return new ElementLocator(this.page, selector)
  }

  // Wait for specific conditions
  async waitForSelector(selector: string, options: { timeout?: number } = {}) {
    return this.locator(selector).waitFor(options)
  }

  async waitForLoadState(options: { timeout?: number } = {}) {
    const timeout = options.timeout || 10000
    return new Promise((resolve, reject) => {
      if (document.readyState === "complete") {
        resolve(true)
      } else {
        const onLoad = () => {
          document.removeEventListener("DOMContentLoaded", onLoad)
          resolve(true)
        }
        document.addEventListener("DOMContentLoaded", onLoad)

        // Timeout fallback
        setTimeout(() => {
          document.removeEventListener("DOMContentLoaded", onLoad)
          if (
            document.readyState === "complete" ||
            document.readyState === "interactive"
          ) {
            resolve(true)
          } else {
            reject(
              new Error(
                `Timeout waiting for page load state (waited ${timeout}ms)`
              )
            )
          }
        }, timeout)
      }
    })
  }
}

// Playwright-inspired Locator class
class ElementLocator {
  private container: Element | Document
  private selector: string
  private options?: any

  constructor(container: Element | Document, selector: string, options?: any) {
    this.container = container
    this.selector = selector
    this.options = options
  }

  // Find element with Playwright-style logic
  private findElement(): HTMLElement | null {
    try {
      let elements: NodeListOf<Element>

      if (this.selector === "*" && this.options?.text) {
        elements = this.container.querySelectorAll("*")
        const searchText =
          this.options.text instanceof RegExp
            ? this.options.text
            : new RegExp(this.options.text, "i")

        for (const element of elements) {
          if (
            element.textContent &&
            searchText.test(element.textContent.trim())
          ) {
            return element as HTMLElement
          }
        }
        return null
      }

      elements = this.container.querySelectorAll(this.selector)

      if (!this.options?.name) {
        return (elements[0] as HTMLElement) || null
      }

      for (const element of elements) {
        const ariaLabel = element.getAttribute("aria-label")
        const textContent = element.textContent?.trim()
        const title = element.getAttribute("title")

        const searchText =
          this.options.name instanceof RegExp
            ? this.options.name
            : new RegExp(this.options.name, "i")

        if (
          (ariaLabel && searchText.test(ariaLabel)) ||
          (textContent && searchText.test(textContent)) ||
          (title && searchText.test(title))
        ) {
          return element as HTMLElement
        }
      }

      return null
    } catch (error) {
      console.warn(
        `Error finding element with selector "${this.selector}":`,
        error
      )
      return null
    }
  }

  // Playwright-style action methods
  async click(options: { timeout?: number; force?: boolean } = {}) {
    const element = await this.waitFor({ timeout: options.timeout })
    if (!element) throw new Error(`Element not found: ${this.selector}`)

    if (!options.force && !this.isElementVisible(element)) {
      throw new Error(`Element is not visible: ${this.selector}`)
    }

    await this.dispatchEvent(element, "click")
    return element
  }

  async fill(text: string, options: { timeout?: number } = {}) {
    const element = await this.waitFor({ timeout: options.timeout })
    if (!element) throw new Error(`Element not found: ${this.selector}`)

    // Clear existing content
    element.focus()

    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
      ;(element as HTMLInputElement).value = ""
      ;(element as HTMLInputElement).value = text
    } else if (element.isContentEditable) {
      element.textContent = ""
      element.textContent = text
      element.innerText = text
    }

    // Dispatch events in sequence like a real user
    await this.dispatchEvent(element, "focus")
    await this.dispatchEvent(element, "input", {
      inputType: "insertText",
      data: text,
    })
    await this.dispatchEvent(element, "change")

    return element
  }

  async type(text: string, options: { delay?: number; timeout?: number } = {}) {
    const element = await this.waitFor({ timeout: options.timeout })
    if (!element) throw new Error(`Element not found: ${this.selector}`)

    element.focus()

    // Type character by character with optional delay
    for (const char of text) {
      if (element.isContentEditable) {
        element.textContent = (element.textContent || "") + char
      } else {
        ;(element as HTMLInputElement).value =
          ((element as HTMLInputElement).value || "") + char
      }

      await this.dispatchEvent(element, "input", {
        inputType: "insertText",
        data: char,
      })

      if (options.delay) {
        await new Promise((resolve) => setTimeout(resolve, options.delay))
      }
    }

    await this.dispatchEvent(element, "change")
    return element
  }

  async waitFor(options: { timeout?: number } = {}): Promise<HTMLElement> {
    const timeout = options.timeout || 5000
    const interval = 100
    let elapsed = 0

    return new Promise((resolve, reject) => {
      const check = () => {
        const element = this.findElement()
        if (element && this.isElementVisible(element)) {
          resolve(element)
          return
        }

        elapsed += interval
        if (elapsed >= timeout) {
          reject(
            new Error(
              `Timeout waiting for element: ${this.selector} (waited ${timeout}ms)`
            )
          )
          return
        }

        setTimeout(check, interval)
      }

      check()
    })
  }

  async isVisible(): Promise<boolean> {
    const element = this.findElement()
    return element ? this.isElementVisible(element) : false
  }

  private isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element)
    const rect = element.getBoundingClientRect()

    return (
      !!(
        element.offsetWidth ||
        element.offsetHeight ||
        element.getClientRects().length
      ) &&
      style.visibility !== "hidden" &&
      style.display !== "none" &&
      rect.width > 0 &&
      rect.height > 0
    )
  }

  private async dispatchEvent(
    element: HTMLElement,
    eventType: string,
    eventData?: any
  ) {
    let event: Event

    switch (eventType) {
      case "input":
        event = new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: eventData?.inputType || "insertText",
          data: eventData?.data,
        })
        break
      case "change":
        event = new Event("change", { bubbles: true, cancelable: true })
        break
      case "click":
        const rect = element.getBoundingClientRect()
        event = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          button: 0,
        })
        break
      case "focus":
        event = new FocusEvent("focus", { bubbles: true, cancelable: true })
        break
      default:
        event = new Event(eventType, { bubbles: true, cancelable: true })
    }

    element.dispatchEvent(event)

    // For contenteditable elements, also dispatch composition events
    if (
      element.isContentEditable &&
      (eventType === "input" || eventType === "change")
    ) {
      element.dispatchEvent(new Event("textInput", { bubbles: true }))
      element.dispatchEvent(
        new CompositionEvent("compositionend", { bubbles: true })
      )
    }

    // Small delay to simulate real user interaction
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

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
