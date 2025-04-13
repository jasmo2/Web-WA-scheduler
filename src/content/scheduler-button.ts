import { createApp } from "vue"
import SchedulerButton from "../components/SchedulerButton.vue"

window.addEventListener("load", () => {
  const interval = setInterval(() => {
    const speechButton = document
      .querySelector('[data-icon="ptt"]')!
      .closest("button")

    console.log("TCL ~ interval ~ speechButton:", speechButton)
    if (speechButton) {
      clearInterval(interval)

      const container = document.createElement("div")
      container.style.display = "inline-block"
      container.style.marginLeft = "8px" // Add spacing between the buttons

      // Insert the container next to the speech button
      speechButton.parentElement?.appendChild(container)

      // Mount the Vue component
      const app = createApp(SchedulerButton, {
        iconSrc: chrome.runtime.getURL("./src/assets/calendar.svg"),
      })
      app.mount(container)

      console.log("TCL Scheduler button added successfully!")
    }
  }, 500)
})
