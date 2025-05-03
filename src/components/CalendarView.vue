<template>
  <div class="calendar-overlay" @click.self="$emit('close')">
    <div class="calendar-modal">
      <div class="calendar-wrapper">
        <div class="modal-header">
          <h3>Schedule a Message to {{ recipient }}</h3>
          <button class="close-button" @click="$emit('close')">×</button>
        </div>

        <div class="calendar-container">
          <div class="date-picker">
            <div ref="calendarContainer"></div>
          </div>
        </div>
        <aside class="calendar-controls">
          <div class="message-input">
            <textarea
              v-model="messageText"
              placeholder="Type your message here..."
              rows="4"
            ></textarea>
          </div>

          <div class="action-buttons">
            <button class="cancel-button" @click="$emit('close')">
              Cancel
            </button>
            <button
              class="schedule-button"
              :disabled="!messageText.trim() || isScheduling"
              @click="scheduleMessage"
            >
              {{ isScheduling ? "Scheduling..." : "Schedule Message" }}
            </button>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from "vue"
import { Calendar, type Options } from "vanilla-calendar-pro"
import "vanilla-calendar-pro/styles/index.css"

const CalenderOptions: Options = {
  dateMin: "today",
  type: "default",
  selectionTimeMode: 24,
}

export default defineComponent({
  name: "CalendarView",
  props: {
    recipient: {
      type: String,
      required: true,
    },
  },
  setup(props, { emit }) {
    const calendarContainer = ref<HTMLElement | null>(null)
    const selectedDate = ref<Date | null>(null)
    const selectedTime = ref("12:00")
    const messageText = ref("")
    const isScheduling = ref(false)
    let calendar: any = null

    onMounted(() => {
      // Initialize the calendar
      calendar = new Calendar(calendarContainer.value!, CalenderOptions)
      calendar.init()
    })

    onUnmounted(() => {
      if (calendar) {
        calendar.destroy()
      }
    })

    const scheduleMessage = async () => {
      if (!selectedDate.value || !messageText.value.trim()) return

      try {
        isScheduling.value = true

        // Combine date and time
        const [hours, minutes] = selectedTime.value.split(":").map(Number)
        const scheduledDateTime = new Date(selectedDate.value)
        scheduledDateTime.setHours(hours, minutes, 0, 0)

        // Ensure the scheduled time is in the future
        const now = new Date()
        if (scheduledDateTime <= now) {
          alert("Please select a future date and time.")
          isScheduling.value = false
          return
        }

        // Send the scheduling request to the background script
        const response = await chrome.runtime.sendMessage({
          action: "scheduleMessage",
          data: {
            recipient: props.recipient,
            message: messageText.value,
            scheduledTime: scheduledDateTime.getTime(),
          },
        })

        if (response.success) {
          alert(`Message scheduled for ${scheduledDateTime.toLocaleString()}`)
          emit("close")
        } else {
          throw new Error(response.error || "Failed to schedule message")
        }
      } catch (error) {
        console.error("Error scheduling message:", error)
        alert(`Failed to schedule message: ${(error as Error).message}`)
      } finally {
        isScheduling.value = false
      }
    }

    return {
      calendarContainer,
      isScheduling,
      messageText,
      scheduleMessage,
      selectedTime,
    }
  },
})
</script>

<style scoped>
.calendar-overlay {
  z-index: 100;
}
.calendar-modal {
  --light-gray: #e0e0e0;
  --calendar-padding: 8px;
  --calendar-padding-x2: calc(var(--calendar-padding) * 2);
  --tint-green: #00a884;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  height: 100%;
  justify-content: center;
  left: 0;
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 101;
}

.calendar-wrapper {
  display: flex;
  flex-direction: column;
  background-color: white;
  height: auto;
  width: 50vw;

  @media screen and (min-width: 1091px) {
    display: grid;
    grid-gap: 0;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(auto, 1fr);
  }
}

.calendar-modal-content {
  background-color: white;
  width: 600px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal-header {
  align-items: center;
  background-color: #f5f5f5;
  border-bottom: 1px solid var(#e0e0e0);
  display: flex;
  justify-content: space-between;
  padding: var(--calendar-padding-x2);
  grid-area: 1 / 1 / 2 / 6;
}

.modal-header h3 {
  margin: 0;
  color: #41525d;
  font-size: 18px;
}

.calendar-container {
  padding: var(--calendar-padding);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.date-picker {
  display: flex;
  justify-content: center;
}

.calendar-controls {
  border-top: 1px solid var(#e0e0e0);
  display: flex;
  flex-direction: column;
  gap: var(--calendar-padding);
  grid-area: 2 / 3 / 6 / 5;
}

.action-buttons {
  display: flex;
  justify-content: space-between;
}

.action-buttons button {
  height: auto;
}

.cancel-button {
  background-color: #f5f5f5;
  color: #41525d;
  border: 1px solid var(#e0e0e0);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.schedule-button {
  background-color: #00a884;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

.schedule-button:disabled {
  background-color: var(#e0e0e0);
  cursor: not-allowed;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #8696a0;
}

.calendar-container {
  display: flex;
  padding: var(--calendar-padding);
  grid-area: 2 / 1 / 6 / 3;
}

.time-input {
  margin-top: 8px;
}

.time-input input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(#e0e0e0);
  border-radius: 4px;
}

.message-input {
  border-top: 1px solid var(#e0e0e0);
  flex: 7;
  padding: var(--calendar-padding);
  padding-right: var(--calendar-padding-x2);
}

.formatting-toolbar {
  display: flex;
  margin-bottom: 8px;
  gap: 8px;
}

.formatting-toolbar button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  color: #8696a0;
}

.attach-btn {
  margin-left: auto;
}

textarea {
  width: calc(100% - var(--calendar-padding-x2));
  height: 100px;
  padding: 8px;
  border: 1px solid var(#e0e0e0);
  border-radius: 4px;
  resize: none;
}

.action-buttons {
  border-top: 1px solid var(#e0e0e0);
  display: flex;
  flex: 1;
  justify-content: space-between;
  padding: var(--calendar-padding);
}

.schedule-btn {
  background-color: var(--tint-green);
  border-radius: 4px;
  border: none;
  color: white;
  cursor: pointer;
  font-weight: 600;
  padding: 8px 16px;
}

/* Override calendar styles */
:deep(.vanilla-calendar) {
  width: 100%;
  max-width: 350px;
  margin: 0 auto;
}
</style>
