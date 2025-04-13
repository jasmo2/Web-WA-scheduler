import { createApp } from "vue"
import SchedulerButton from "../components/SchedulerButton.vue"

window.addEventListener("load", () => {
  const interval = setInterval(() => {
    const speechButton = document.querySelector('[data-testid="ptt"]') // WhatsApp's speech button selector
    if (speechButton) {
      clearInterval(interval)

      // Create a container for the Vue component
      const container = document.createElement("div")
      container.style.display = "inline-block"
      speechButton.parentElement!.insertBefore(
        container,
        speechButton.nextSibling
      )

      // Mount the Vue component
      const app = createApp(SchedulerButton, {
        //@ts-ignore
        iconSrc: chrome.runtime.getURL("icons/icon48.png"),
      })
      app.mount(container)
    }
  }, 500)
})
