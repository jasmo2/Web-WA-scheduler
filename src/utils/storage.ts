export interface ScheduledMessage {
  id: string
  recipient: string
  message: string
  scheduledTime: number // timestamp
  status: "pending" | "sent" | "failed"
}

export async function getScheduledMessages(): Promise<ScheduledMessage[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get("scheduledMessages", (result) => {
      resolve(result.scheduledMessages || [])
    })
  })
}

export async function saveScheduledMessage(
  message: Omit<ScheduledMessage, "id" | "status">
): Promise<ScheduledMessage> {
  const scheduledMessages = await getScheduledMessages()

  const newMessage: ScheduledMessage = {
    ...message,
    id: Date.now().toString(),
    status: "pending",
  }

  await chrome.storage.local.set({
    scheduledMessages: [...scheduledMessages, newMessage],
  })

  return newMessage
}

export async function updateScheduledMessage(
  updatedMessage: ScheduledMessage
): Promise<void> {
  const scheduledMessages = await getScheduledMessages()
  const index = scheduledMessages.findIndex(
    (msg) => msg.id === updatedMessage.id
  )

  if (index !== -1) {
    scheduledMessages[index] = updatedMessage
    await chrome.storage.local.set({ scheduledMessages })
  }
}

export async function removeScheduledMessage(id: string): Promise<void> {
  const scheduledMessages = await getScheduledMessages()
  await chrome.storage.local.set({
    scheduledMessages: scheduledMessages.filter((msg) => msg.id !== id),
  })
}
