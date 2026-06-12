<script setup lang="ts">
import { ref } from 'vue'

import { chatApi } from '@/api'
import ChatContent from './components/chat-content.vue'
import ChatFooter from './components/chat-footer.vue'
import ChatHeader from './components/chat-header.vue'
import ChatSidebar from './components/chat-sidebar.vue'

import type { ChatMessage, ChatStreamEvent } from '@/api'

const CHAT_MODEL = 'deepseek-v4-flash'

const messages = ref<ChatMessage[]>([])
const isStreaming = ref(false)
const errorMessage = ref('')

/**
 * 提交用户消息，并将 SSE 内容持续追加到当前助手消息。
 */
async function sendMessage(content: string): Promise<void> {
    const normalizedContent = content.trim()

    if (!normalizedContent || isStreaming.value) {
        return
    }

    errorMessage.value = ''
    messages.value.push({
        role: 'user',
        content: normalizedContent,
    })

    const requestMessages = messages.value.map(copyMessage)
    const assistantIndex = messages.value.push({
        role: 'assistant',
        content: '',
    }) - 1

    isStreaming.value = true

    try {
        let streamError = ''

        await chatApi.streamChat(
            {
                provider: 'deepseek',
                model: CHAT_MODEL,
                messages: requestMessages,
                context: [],
            },
            /** 记录服务端错误，并持续写入内容事件。 */
            event => {
                streamError = handleStreamEvent(event, assistantIndex)
                    || streamError
            },
        )

        if (streamError) {
            throw new Error(streamError)
        }
    } catch (error) {
        const assistantMessage = messages.value[assistantIndex]

        if (assistantMessage && !assistantMessage.content) {
            messages.value.splice(assistantIndex, 1)
        }

        errorMessage.value = error instanceof Error
            ? error.message
            : '发送消息失败'
    } finally {
        isStreaming.value = false
    }
}

/**
 * 复制一条消息，避免请求过程持有响应式对象。
 */
function copyMessage(message: ChatMessage): ChatMessage {
    return { ...message }
}

/**
 * 将单条流事件写入当前助手消息，并返回服务端错误信息。
 */
function handleStreamEvent(
    event: ChatStreamEvent,
    assistantIndex: number,
): string {
    if (event.type === 'content') {
        const assistantMessage = messages.value[assistantIndex]

        if (assistantMessage) {
            assistantMessage.content += event.content
        }
    }

    return event.type === 'error' ? event.message : ''
}
</script>

<template>
    <div class="chat-page">
        <ChatSidebar />

        <main class="chat-main">
            <ChatHeader />
            <ChatContent
                :messages="messages"
                :is-streaming="isStreaming"
                :error-message="errorMessage"
            />
            <ChatFooter
                :disabled="isStreaming"
                @send="sendMessage"
            />
        </main>
    </div>
</template>

<style scoped>
.chat-page {
    display: flex;
    width: 100%;
    min-width: 900px;
    height: 100vh;
    padding: 8px;
    gap: 8px;
    background: var(--color-background);
}

.chat-main {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    gap: 8px;
    border: 1px solid var(--color-border-strong);
    background: var(--color-surface);
}
</style>
