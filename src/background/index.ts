import {
  getScheduledMessages,
  saveScheduledMessage,
  updateScheduledMessage,
  type ScheduledMessage,
} from "../utils/storage"

console.log("TCL WhatsApp Scheduler Background Service Worker Started!")

// Set up alarm handler
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log("TCL Alarm triggered:", alarm.name)

  if (alarm.name.startsWith("scheduled-message-")) {
    const messageId = alarm.name.replace("scheduled-message-", "")
    await processScheduledMessage(messageId)
  }
})

// Handle message scheduling
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "scheduleMessage") {
    scheduleMessage(message.data, sendResponse)
    return true // Keep the message channel open for async response
  }
})

async function scheduleMessage(
  data: { recipient: string; message: string; scheduledTime: number },
  sendResponse: (response?: any) => void
) {
  try {
    // Schedule the alarm
    const scheduledTime = new Date(data.scheduledTime)
    console.log(`TCL Scheduling message for ${scheduledTime.toLocaleString()}`)

    // Save to storage
    const savedMessage = await saveScheduledMessage({
      recipient: data.recipient,
      message: data.message,
      scheduledTime: data.scheduledTime,
    })

    // Create an alarm
    chrome.alarms.create(`scheduled-message-${savedMessage.id}`, {
      when: data.scheduledTime,
    })

    sendResponse({ success: true, message: savedMessage })
  } catch (error) {
    console.error("Failed to schedule message:", error)
    sendResponse({ success: false, error: (error as Error).message })
  }
}

async function processScheduledMessage(messageId: string) {
  const messages = await getScheduledMessages()
  const message = messages.find((msg) => msg.id === messageId)

  if (!message) {
    console.error(`Scheduled message ${messageId} not found`)
    return
  }

  // Try to send the message by opening WhatsApp Web
  try {
    // Open WhatsApp Web if not already open
    const tabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" })

    if (tabs.length === 0) {
      await chrome.tabs.create({ url: "https://web.whatsapp.com/" })
      // Wait for WhatsApp to load before proceeding
      setTimeout(() => sendMessageToWhatsApp(message), 10000)
    } else {
      await sendMessageToWhatsApp(message)
    }
  } catch (error) {
    console.error(`Failed to process message ${messageId}:`, error)

    // Update message status to failed
    message.status = "failed"
    await updateScheduledMessage(message)
  }
}

async function sendMessageToWhatsApp(message: ScheduledMessage) {
  try {
    const tabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" })

    if (tabs.length === 0) {
      throw new Error("WhatsApp Web is not open")
    }

    // Send message to content script to handle the actual sending
    await chrome.tabs.sendMessage(tabs[0].id!, {
      action: "sendScheduledMessage",
      data: message,
    })

    // Update message status to sent
    message.status = "sent"
    await updateScheduledMessage(message)
  } catch (error) {
    console.error("Error sending message:", error)
    message.status = "failed"
    await updateScheduledMessage(message)
  }
}

// Initialize: check for missed alarms (e.g., if browser was closed)
chrome.runtime.onStartup.addListener(checkMissedSchedules)
chrome.runtime.onInstalled.addListener(checkMissedSchedules)

async function checkMissedSchedules() {
  const messages = await getScheduledMessages()
  const now = Date.now()

  for (const message of messages) {
    if (message.status === "pending") {
      if (message.scheduledTime <= now) {
        // Message was missed, send it now
        console.log("TCL ~ Processing missed scheduled message:", message)
        await processScheduledMessage(message.id)
      } else {
        // Message is still in the future, schedule alarm
        chrome.alarms.create(`scheduled-message-${message.id}`, {
          when: message.scheduledTime,
        })
      }
    }
  }
}
