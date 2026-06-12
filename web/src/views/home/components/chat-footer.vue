<template>
    <footer class="chat-footer">
        <div class="chat-input-wrapper box">
            <div class="chat-input">输入区域</div>
            <div class="send-button box">发送</div>
        </div>
        <div class="answer-notice box">回答提示区域</div>
    </footer>
</template>

<style scoped>
.box {
    border: 1px solid var(--color-border);
}

.chat-footer {
    display: flex;
    min-height: 128px;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
    padding: 16px 32px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
}

.chat-input-wrapper {
    display: flex;
    width: min(900px, 100%);
    min-height: 64px;
    align-items: center;
    padding: 8px;
}

.chat-input {
    flex: 1;
    padding: 12px;
}

.send-button {
    color: var(--color-text-inverse);
    border-color: var(--color-accent);
    background: var(--color-accent);
    padding: 12px 20px;
}

.answer-notice {
    color: var(--color-text-secondary);
    padding: 6px 16px;
}
</style>
