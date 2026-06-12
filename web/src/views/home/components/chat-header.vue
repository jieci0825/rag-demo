<template>
    <header class="chat-header">
        <div class="conversation-info">
            <h1 class="conversation-title">基于知识库的问答设计</h1>
            <p class="conversation-description">知识库对话 · 最后更新于 10:24</p>
        </div>

        <div class="document-status">
            <span class="status-indicator" aria-hidden="true"></span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 3h9l3 3v15H6V3Z" />
                <path d="M15 3v4h4M9 11h6M9 15h6" />
            </svg>
            <span>已连接 12 个文档</span>
        </div>
    </header>
</template>

<style scoped>
.chat-header {
    display: flex;
    height: 72px;
    flex: 0 0 72px;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: 0 20px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
}

.conversation-info {
    min-width: 0;
}

.conversation-title {
    overflow: hidden;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.5;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.conversation-description {
    margin-top: 2px;
    color: var(--color-text-muted);
    font-size: 12px;
    line-height: 1.4;
}

.document-status {
    display: flex;
    height: 36px;
    flex: 0 0 auto;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);
    background: var(--color-surface-subtle);
    font-size: 12px;
    font-weight: 500;
}

.document-status svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.7;
}

.status-indicator {
    width: 6px;
    height: 6px;
    background: var(--color-accent);
}
</style>
