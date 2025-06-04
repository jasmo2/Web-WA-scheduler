// Playwright-inspired Locator class
export class ElementLocator {
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
