<template>
  <dialog open class="calendar-overlay" @click="$emit('close')">
    <article class="calendar-modal" @click.stop>
      <div class="calendar-wrapper">
        <header class="modal-header">
          <h2>Schedule a Message to {{ recipient }}</h2>
          <button
            class="close-button"
            aria-label="Close"
            @click="$emit('close')"
          >
            ×
          </button>
        </header>

        <main class="calendar-container">
          <section ref="calendarContainer"></section>
        </main>

        <aside class="calendar-controls">
          <section class="message-input">
            <label for="message-textarea" class="sr-only">Message</label>
            <textarea
              id="message-textarea"
              v-model="messageText"
              placeholder="Type your message here..."
              rows="4"
              aria-label="Your message"
            ></textarea>
          </section>

          <footer class="action-buttons">
            <button class="cancel-button" @click="$emit('close')">
              Cancel
            </button>
            <button
              class="schedule-button"
              :disabled="!messageText.trim() || isScheduling"
              @click="scheduleMessage"
              :aria-busy="isScheduling"
            >
              {{ isScheduling ? "Scheduling..." : "Schedule Message" }}
            </button>
          </footer>
        </aside>
      </div>
    </article>
  </dialog>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from "vue"
import { Calendar, type Options } from "vanilla-calendar-pro"
import "vanilla-calendar-pro/styles/index.css"

function createInitialDate(daysOffset = 0) {
  // Create a date with the specified offset
  const now = new Date()
  const targetDate = new Date(now)
  targetDate.setDate(now.getDate() + daysOffset)

  // Format as YYYY-MM-DD
  const year = targetDate.getFullYear()
  const month = String(targetDate.getMonth() + 1).padStart(2, "0") // months are 0-indexed
  const day = String(targetDate.getDate()).padStart(2, "0")

  // For single date selection
  const formattedDate = `${year}-${month}-${day}`

  // You could also return a date range like this:
  // return [`${year}-${month}-${day}`, `${year}-${month}-${Number(day) + 5}`];

  return formattedDate
}
function createInitialTime(offset = 0) {
  const now = new Date()
  const futureTime = new Date(now.getTime() + offset * 60 * 1000)

  // For 24-hour format (current implementation)
  const minutes = String(futureTime.getMinutes()).padStart(2, "0")

  // For 12-hour format with AM/PM
  let hours12 = futureTime.getHours() % 12
  hours12 = hours12 === 0 ? 12 : hours12
  const period = futureTime.getHours() >= 12 ? "PM" : "AM"
  const time12 = `${String(hours12).padStart(2, "0")}:${minutes} ${period}`

  // Return the appropriate format based on selectionTimeMode
  // If using selectionTimeMode: 24, return time24
  // If using selectionTimeMode: 12, return time12
  return time12 // Or time12 if you switch to 12-hour mode
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
    const initTime = createInitialTime(1)
    const initDate = createInitialDate()

    const CalenderOptions: Options = {
      dateMin: "today",
      type: "default",
      selectionTimeMode: 12,
      selectedTime: initTime,
      selectedDates: [initDate],
      onClickDate(self) {
        setTimeAndDate(self)
      },
      onChangeTime(self) {
        setTimeAndDate(self)
      },
    }
    const calendarContainer = ref<HTMLElement | null>(null)
    const selectedDate = ref<Date | number | string | null>(initDate)
    const selectedTime = ref(initTime)
    const messageText = ref("")
    const isScheduling = ref(false)
    selectedTime
    let calendar: any = null
    function setTimeAndDate(calendar: Calendar) {
      const sTime = calendar.context.selectedTime
      const sDate = calendar.context.selectedDates[0]

      selectedDate.value = sDate
      selectedTime.value = sTime
    }

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

        // Parse 12-hour format time (e.g., "12:44 PM")
        const timeMatch = selectedTime.value.match(
          /(\d{1,2}):(\d{2})\s*(AM|PM)/i
        )
        if (!timeMatch) {
          alert("Invalid time format.")
          isScheduling.value = false
          return
        }

        let hours = parseInt(timeMatch[1], 10)
        const minutes = parseInt(timeMatch[2], 10)
        const period = timeMatch[3].toUpperCase()

        // Convert to 24-hour format
        if (period === "AM" && hours === 12) {
          hours = 0 // 12:xx AM becomes 0:xx
        } else if (period === "PM" && hours !== 12) {
          hours += 12 // 1:xx PM becomes 13:xx, but 12:xx PM stays 12:xx
        }

        // Combine date and time - Fix potential timezone issues
        let scheduledDateTime: Date

        console.log("TCL ~ Selected date value:", selectedDate.value)
        console.log("TCL ~ Selected time value:", selectedTime.value)

        if (typeof selectedDate.value === "string") {
          // If it's a string like "2025-06-01", create date in local timezone
          const dateParts = selectedDate.value.split("-")
          if (dateParts.length === 3) {
            const year = parseInt(dateParts[0], 10)
            const month = parseInt(dateParts[1], 10) - 1 // Month is 0-indexed
            const day = parseInt(dateParts[2], 10)
            scheduledDateTime = new Date(year, month, day)
            console.log("TCL ~ Created date from parts:", {
              year,
              month: month + 1,
              day,
            })
          } else {
            scheduledDateTime = new Date(selectedDate.value)
            console.log("TCL ~ Created date from string:", selectedDate.value)
          }
        } else {
          scheduledDateTime = new Date(selectedDate.value)
          console.log(
            "TCL ~ Created date from date object:",
            selectedDate.value
          )
        }

        scheduledDateTime.setHours(hours, minutes, 0, 0)
        console.log(
          "TCL ~ Final scheduled datetime:",
          scheduledDateTime.toLocaleString()
        )
        console.log(
          "TCL ~ Final scheduled timestamp:",
          scheduledDateTime.getTime(),
          "\n----------\n----------\n----------\n----------\n----------\n----------\n----------\n----------"
        )

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
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  margin: 0;
  padding: 0;
  border: none;
}

.calendar-modal {
  --light-gray: #e0e0e0;
  --calendar-padding: 8px;
  --calendar-padding-x2: calc(var(--calendar-padding) * 2);
  --tint-green: #00a884;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  max-width: 90vw;
  max-height: 90vh;
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

.modal-header h2 {
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

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
