import {
  getScheduledMessages,
  saveScheduledMessage,
  updateScheduledMessage,
  type ScheduledMessage,
} from "../utils/storage"

// Set up alarm handler
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log(
    "TCL ~ Alarm fired:",
    alarm.name,
    "at",
    new Date(alarm.scheduledTime || Date.now()).toLocaleString()
  )
  if (alarm.name.startsWith("scheduled-message-")) {
    const messageId = alarm.name.replace("scheduled-message-", "")
    console.log("TCL ~ Processing scheduled message:", messageId)
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
    console.log("TCL ~ Scheduling message:", {
      recipient: data.recipient,
      message: data.message.substring(0, 50) + "...",
      scheduledTime: new Date(data.scheduledTime).toLocaleString(),
      timestamp: data.scheduledTime,
    })

    // Save to storage
    const savedMessage = await saveScheduledMessage({
      recipient: data.recipient,
      message: data.message,
      scheduledTime: data.scheduledTime,
    })

    // Create an alarm
    const alarmName = `scheduled-message-${savedMessage.id}`
    await chrome.alarms.create(alarmName, {
      when: data.scheduledTime,
    })

    console.log(
      "TCL ~ Created alarm:",
      alarmName,
      "for",
      new Date(data.scheduledTime).toLocaleString()
    )
    sendResponse({ success: true, message: savedMessage })
  } catch (error) {
    console.log("TCL ~ Failed to schedule message:", error)
    sendResponse({ success: false, error: (error as Error).message })
  }
}

async function processScheduledMessage(messageId: string) {
  console.log("TCL ~ Processing scheduled message ID:", messageId)
  const messages = await getScheduledMessages()
  const message = messages.find((msg) => msg.id === messageId)

  if (!message) {
    console.log("TCL ~ Scheduled message not found:", messageId)
    return
  }

  console.log("TCL ~ Found message:", {
    recipient: message.recipient,
    message: message.message.substring(0, 50) + "...",
    scheduledTime: new Date(message.scheduledTime).toLocaleString(),
    status: message.status,
  })

  // Try to send the message by opening WhatsApp Web
  try {
    // Check for existing WhatsApp tabs
    const tabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" })
    console.log("TCL ~ Found WhatsApp tabs:", tabs.length)

    if (tabs.length === 0) {
      console.log("TCL ~ No WhatsApp tabs found, creating new tab...")
      await chrome.tabs.create({ url: "https://web.whatsapp.com/" })
      // Wait for WhatsApp to load before proceeding
      console.log("TCL ~ Waiting for WhatsApp to load...")
      setTimeout(() => sendMessageToWhatsApp(message), 10000)
    } else {
      console.log("TCL ~ Using existing WhatsApp tab:", tabs[0].id)
      await sendMessageToWhatsApp(message)
    }
  } catch (error) {
    console.log("TCL ~ Failed to process message:", messageId, error)

    // Update message status to failed
    message.status = "failed"
    await updateScheduledMessage(message)
  }
}

async function sendMessageToWhatsApp(message: ScheduledMessage) {
  try {
    console.log("TCL ~ Attempting to send message to WhatsApp...")
    const tabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" })

    if (tabs.length === 0) {
      throw new Error("WhatsApp Web is not open")
    }

    console.log("TCL ~ Sending message to content script in tab:", tabs[0].id)

    // Send message to content script to handle the actual sending
    await chrome.tabs.sendMessage(tabs[0].id!, {
      action: "sendScheduledMessage",
      data: message,
    })

    console.log("TCL ~ Message sent successfully to content script")

    // Update message status to sent
    message.status = "sent"
    await updateScheduledMessage(message)
  } catch (error) {
    console.log("TCL ~ Error sending message:", error)
    message.status = "failed"
    await updateScheduledMessage(message)
  }
}

// Initialize: check for missed alarms (e.g., if browser was closed)
chrome.runtime.onStartup.addListener(checkMissedSchedules)
chrome.runtime.onInstalled.addListener(checkMissedSchedules)

async function checkMissedSchedules() {
  console.log("TCL ~ Checking for missed schedules...")
  const messages = await getScheduledMessages()
  const now = Date.now()

  console.log("TCL ~ Found", messages.length, "total messages")
  const pendingMessages = messages.filter((msg) => msg.status === "pending")
  console.log("TCL ~ Found", pendingMessages.length, "pending messages")

  for (const message of pendingMessages) {
    const scheduledDate = new Date(message.scheduledTime)
    console.log(
      "TCL ~ Checking message:",
      message.id,
      "scheduled for",
      scheduledDate.toLocaleString()
    )

    if (message.scheduledTime <= now) {
      console.log("TCL ~ Message was missed, sending now:", message.id)
      // Message was missed, send it now
      await processScheduledMessage(message.id)
    } else {
      console.log(
        "TCL ~ Message is still in future, scheduling alarm:",
        message.id
      )
      // Message is still in the future, schedule alarm
      await chrome.alarms.create(`scheduled-message-${message.id}`, {
        when: message.scheduledTime,
      })
    }
  }
}
