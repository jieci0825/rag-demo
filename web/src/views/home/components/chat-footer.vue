<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
    disabled: boolean
}>()

const emit = defineEmits<{
    send: [content: string]
}>()

const content = ref('')

/**
 * 提交非空消息，并在提交后清空输入框。
 */
function submitMessage(): void {
    const normalizedContent = content.value.trim()

    if (!normalizedContent || props.disabled) {
        return
    }

    emit('send', normalizedContent)
    content.value = ''
}
</script>

<template>
    <footer class="chat-footer">
        <div class="composer">
            <textarea
                v-model="content"
                class="composer-input"
                rows="2"
                placeholder="输入你的问题，按 Enter 发送"
                aria-label="消息内容"
                :disabled="disabled"
                @keydown.enter.exact.prevent="submitMessage"
            ></textarea>

            <button
                class="send-button"
                type="button"
                aria-label="发送消息"
                :disabled="disabled || !content.trim()"
                @click="submitMessage"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m4 4 17 8-17 8 3-8-3-8Z" />
                    <path d="M7 12h14" />
                </svg>
            </button>
        </div>
    </footer>
</template>

<style scoped>
.chat-footer {
    display: flex;
    height: 144px;
    flex: 0 0 144px;
    align-items: center;
    flex-direction: column;
    padding: 16px 32px;
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
}

.composer {
    display: flex;
    width: min(900px, 100%);
    height: 100%;
    align-items: flex-end;
    gap: 12px;
    padding: 10px;
    border: 1px solid var(--color-border-strong);
    background: var(--color-surface);
}

.composer:focus-within {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.composer-input {
    min-width: 0;
    height: 100%;
    flex: 1;
    padding: 2px;
    resize: none;
    color: var(--color-text-primary);
    border: 0;
    outline: 0;
    background: transparent;
    font: inherit;
    font-size: 14px;
    line-height: 1.5;
}

.composer-input::placeholder {
    color: var(--color-text-muted);
}

.composer-input:disabled {
    cursor: not-allowed;
}

.send-button {
    display: grid;
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    place-items: center;
    color: var(--color-text-inverse);
    border: 0;
    background: var(--color-accent);
    cursor: pointer;
}

.send-button:hover {
    background: var(--color-accent-hover);
}

.send-button:active {
    background: var(--color-accent-active);
}

.send-button:disabled {
    background: var(--color-border-strong);
    cursor: not-allowed;
}

.send-button svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.7;
}
</style>
