import { ElementLocator } from "./ElementLocator"

// Playwright-inspired Page class for WhatsApp automation
export class WhatsAppPage {
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
