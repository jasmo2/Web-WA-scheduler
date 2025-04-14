<template>
  <div class="calendar-modal">
    <div class="calendar-modal-content">
      <div class="calendar-header">
        <h3>Schedule a message to {{ recipient }}</h3>
        <button class="close-button" @click="closeModal">&times;</button>
      </div>
      
      <div class="calendar-container">
        <div class="date-picker">
          <div id="vanilla-calendar"></div>
        </div>
        
        <div class="time-picker">
          <label>Send Time</label>
          <div class="time-input">
            <input type="time" v-model="selectedTime" />
          </div>
        </div>
      </div>
      
      <div class="message-input">
        <div class="formatting-toolbar">
          <button class="bold-btn">B</button>
          <button class="italic-btn">I</button>
          <button class="strikethrough-btn">S</button>
          <button class="emoji-btn">😊</button>
          <!-- <button class="attach-btn">📎 Add files</button> -->
        </div>
        <textarea placeholder="Type a message" v-model="message"></textarea>
      </div>
      
      <div class="action-buttons">
        <button class="schedule-btn" @click="scheduleMessage">Schedule Msg</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import { Calendar, type Options } from 'vanilla-calendar-pro';
import 'vanilla-calendar-pro/styles/index.css';

const CalenderOptions: Options = {
  dateMin: 'today',
  type: 'default',
  selectionTimeMode: 24
}

export default defineComponent({
  props: {
    recipient: {
      type: String,
      default: ''
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const selectedDate = ref(new Date());
    const selectedTime = ref('12:12');
    const message = ref('');
    let calendar: any = null;

    onMounted(() => {
      // Initialize the calendar
      calendar = new Calendar('#vanilla-calendar', CalenderOptions);
      calendar.init();
    });

    const closeModal = () => {
      emit('close');
    };

    const scheduleMessage = () => {
      // Combine date and time
      const scheduledDate = new Date(selectedDate.value);
      const [hours, minutes] = selectedTime.value.split(':').map(Number);
      scheduledDate.setHours(hours, minutes);
      
      console.log('Scheduling message:', {
        recipient: props.recipient,
        message: message.value,
        scheduledTime: scheduledDate
      });
      
      // In a real implementation, you would send this to a background script
      alert(`Message scheduled for ${scheduledDate.toLocaleString()}`);
      closeModal();
    };

    return {
      selectedTime,
      message,
      closeModal,
      scheduleMessage
    };
  }
});
</script>

<style scoped>
.calendar-modal {
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

.time-picker {
  flex: 1;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
}

.time-picker label {
  margin-bottom: 8px;
  color: #8696a0;
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
  padding: 16px;
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
  width: 100%;
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