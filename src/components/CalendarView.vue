<template>
  <div class="calendar-overlay" @click.self="$emit('close')">
    <div class="calendar-modal">
      <div class="modal-header">
        <h3>Schedule a Message to {{ recipient }}</h3>
        <button class="close-button" @click="$emit('close')">×</button>
      </div>
      
      <div class="calendar-container">
        <div class="date-picker">
          <div ref="calendarContainer"></div>
        </div>
      </div>
      
      <div class="message-input">
        <textarea 
          v-model="messageText" 
          placeholder="Type your message here..."
          rows="4"
        ></textarea>
      </div>
      
      <div class="action-buttons">
        <button class="cancel-button" @click="$emit('close')">Cancel</button>
        <button 
          class="schedule-button" 
          :disabled="!messageText.trim() || isScheduling" 
          @click="scheduleMessage"
        >
          {{ isScheduling ? 'Scheduling...' : 'Schedule Message' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import { Calendar, type Options } from 'vanilla-calendar-pro';
import 'vanilla-calendar-pro/styles/index.css';

const CalenderOptions: Options = {
  dateMin: 'today',
  type: 'default',
  selectionTimeMode: 24
}

export default defineComponent({
  name: 'CalendarView',
  props: {
    recipient: {
      type: String,
      required: true
    }
  },
  setup(props, { emit }) {
    const calendarContainer = ref<HTMLElement | null>(null);
    const selectedDate = ref<Date | null>(null);
    const selectedTime = ref('12:00');
    const messageText = ref('');
    const isScheduling = ref(false);
    let calendar: any = null;

    onMounted(() => {
      // Initialize the calendar
      calendar = new Calendar(calendarContainer.value!, CalenderOptions);
      calendar.init();
    });

    onUnmounted(() => {
      if (calendar) {
        calendar.destroy();
      }
    });

    const scheduleMessage = async () => {
      if (!selectedDate.value || !messageText.value.trim()) return;
      
      try {
        isScheduling.value = true;
        
        // Combine date and time
        const [hours, minutes] = selectedTime.value.split(':').map(Number);
        const scheduledDateTime = new Date(selectedDate.value);
        scheduledDateTime.setHours(hours, minutes, 0, 0);
        
        // Ensure the scheduled time is in the future
        const now = new Date();
        if (scheduledDateTime <= now) {
          alert('Please select a future date and time.');
          isScheduling.value = false;
          return;
        }
        
        // Send the scheduling request to the background script
        const response = await chrome.runtime.sendMessage({
          action: 'scheduleMessage',
          data: {
            recipient: props.recipient,
            message: messageText.value,
            scheduledTime: scheduledDateTime.getTime()
          }
        });
        
        if (response.success) {
          alert(`Message scheduled for ${scheduledDateTime.toLocaleString()}`);
          emit('close');
        } else {
          throw new Error(response.error || 'Failed to schedule message');
        }
      } catch (error) {
        console.error('Error scheduling message:', error);
        alert(`Failed to schedule message: ${(error as Error).message}`);
      } finally {
        isScheduling.value = false;
      }
    };

    return {
      calendarContainer,
      isScheduling,
      messageText,
      scheduleMessage,
      selectedTime,
    };
  }
});
</script>

<style scoped>
.calendar-modal {
  --message-input-padding: 16px;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.calendar-modal-content {
  background-color: white;
  width: 600px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.calendar-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.calendar-header h3 {
  margin: 0;
  color: #41525d;
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
  padding: 16px;
}

.date-picker {
  flex: 3;
}

.time-input {
  margin-top: 8px;
}

.time-input input {
  width: 100%;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.message-input {
  padding: var(--message-input-padding);
  border-top: 1px solid #e0e0e0;
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
  width: calc(100% - var(--message-input-padding));
  height: 100px;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  resize: none;
}

.action-buttons {
  padding: 16px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #e0e0e0;
}

.schedule-btn {
  background-color: #00a884;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}

/* Override calendar styles */
:deep(.vanilla-calendar) {
  width: 100%;
  max-width: 350px;
  margin: 0 auto;
}
</style>