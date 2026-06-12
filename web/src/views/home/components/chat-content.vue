<script setup lang="ts">
import { ref, watch } from 'vue'

import type { ChatMessage } from '@/api'

const props = defineProps<{
    messages: ChatMessage[]
    isStreaming: boolean
    errorMessage: string
}>()

const contentElement = ref<HTMLElement | null>(null)

/**
 * 将消息区域滚动到最新内容。
 */
function scrollToLatestMessage(): void {
    const element = contentElement.value

    if (element) {
        element.scrollTop = element.scrollHeight
    }
}

watch(
    /** 跟踪新增消息与最后一条流式消息的内容变化。 */
    () => [
        props.messages.length,
        props.messages.at(-1)?.content,
    ],
    scrollToLatestMessage,
    { flush: 'post' },
)
</script>

<template>
    <div ref="contentElement" class="chat-content">
        <div class="message-list">
            <div v-if="messages.length === 0" class="empty-state">
                <div class="empty-title">开始一段对话</div>
                <div class="empty-description">
                    输入问题后，AI 回复会实时显示在这里。
                </div>
            </div>

            <template
                v-for="(message, index) in messages"
                :key="index"
            >
                <div
                    v-if="message.role === 'user'"
                    class="user-message-row"
                >
                    <div class="user-message">{{ message.content }}</div>
                    <div class="avatar">你</div>
                </div>

                <div v-else class="assistant-message-row">
                    <div class="avatar">AI</div>
                    <div class="assistant-message">
                        <span v-if="message.content">{{ message.content }}</span>
                        <span
                            v-else-if="isStreaming && index === messages.length - 1"
                            class="streaming-placeholder"
                        >
                            正在思考
                        </span>
                    </div>
                </div>
            </template>

            <div v-if="errorMessage" class="error-message">
                {{ errorMessage }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.chat-content {
    min-height: 0;
    flex: 1;
    padding: 32px;
    overflow-y: auto;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
}

.message-list {
    display: flex;
    max-width: 900px;
    margin: 0 auto;
    flex-direction: column;
    gap: 32px;
}

.empty-state {
    padding: 80px 24px;
    color: var(--color-text-secondary);
    text-align: center;
}

.empty-title {
    color: var(--color-text-primary);
    font-size: 18px;
    font-weight: 700;
}

.empty-description {
    margin-top: 8px;
    font-size: 13px;
}

.user-message-row {
    display: flex;
    max-width: 80%;
    align-items: flex-start;
    align-self: flex-end;
    gap: 12px;
}

.user-message,
.assistant-message {
    padding: 14px 16px;
    line-height: 1.7;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.user-message {
    background: var(--color-highlight);
}

.avatar {
    display: flex;
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    align-items: center;
    justify-content: center;
    color: var(--color-text-inverse);
    background: var(--color-accent);
    font-size: 12px;
    font-weight: 700;
    text-align: center;
}

.assistant-message-row {
    display: flex;
    max-width: 88%;
    align-items: flex-start;
    gap: 12px;
}

.assistant-message {
    flex: 1;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
}

.streaming-placeholder {
    color: var(--color-text-muted);
}

.streaming-placeholder::after {
    content: "...";
    display: inline-block;
    width: 1.5em;
    overflow: hidden;
    vertical-align: bottom;
    animation: streaming-dots 1.2s steps(4, end) infinite;
}

.error-message {
    padding: 12px 16px;
    color: #991b1b;
    border: 1px solid #fecaca;
    background: #fef2f2;
    font-size: 13px;
}

@keyframes streaming-dots {
    from {
        width: 0;
    }

    to {
        width: 1.5em;
    }
}
</style>
