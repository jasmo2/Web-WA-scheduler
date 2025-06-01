<template>
  <button
    class="scheduler-button"
    @click="handleClick"
    title="Schedule a message"
  >
    <div v-html="CalendarSvgRAW"></div>
  </button>

  <!-- Mount the calendar modal when shown -->
  <Teleport to="body" v-if="showCalendar">
    <CalendarView :recipient="currentRecipient" @close="showCalendar = false" />
  </Teleport>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue"
import CalendarSvgRAW from "../assets/calendar.svg?raw"

import CalendarView from "./CalendarView.vue"

export default defineComponent({
  components: {
    CalendarView,
  },
  props: {},
  setup() {
    const showCalendar = ref(false)
    const currentRecipient = ref("Notes")

    const handleClick = () => {
      // Get current chat name if possible
      try {
        const headerElement = document.querySelector(
          "#main > header > div > div > div"
        )
        if (headerElement) {
          currentRecipient.value = headerElement.textContent || "Notes"
          console.log("TCL ~ Found chat name:", currentRecipient.value)
        } else {
          console.log("TCL ~ No header element found, using default recipient")
          currentRecipient.value = "Notes"
        }
      } catch (error) {
        console.log("TCL ~ Error getting chat name:", error)
        currentRecipient.value = "Notes"
      }

      // Show calendar modal
      showCalendar.value = true
    }

    return {
      CalendarSvgRAW,
      currentRecipient,
      handleClick,
      showCalendar,
    }
  },
})
</script>

<style scoped>
:root {
  color-scheme: light dark;
}
.scheduler-button {
  background: none;
  border: none;
  cursor: pointer;
  width: 24px;
  height: 24px;
  padding: 0;
}
.scheduler-button img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.scheduler-button :deep(svg) {
  height: 24px;
  stroke: light-dark(#54656f, #8896a0); /* WhatsApp's icon color */
  width: 24px;
}
</style>
