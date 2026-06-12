<template>
    <header class="chat-header">
        <div class="chat-title box">当前对话标题</div>
        <div class="document-status box">文档连接状态</div>
    </header>
</template>

<style scoped>
.box {
    border: 1px solid var(--color-border);
}

.chat-header {
    display: flex;
    height: 72px;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
}

.chat-title,
.document-status {
    padding: 10px 16px;
}
</style>
