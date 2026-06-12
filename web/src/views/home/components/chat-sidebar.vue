<script setup lang="ts">
import { RouterLink } from 'vue-router'

const conversationGroups = [
    {
        label: '置顶',
        conversations: ['基于知识库的问答设计', '文档切片策略讨论'],
    },
    {
        label: '全部对话',
        conversations: [
            'Vue 项目目录规范',
            '向量检索结果优化',
            'RAG 系统需求梳理',
            '接口异常排查',
        ],
    },
]
</script>

<template>
    <aside class="sidebar">
        <header class="sidebar-header">
            <div class="brand-mark">R</div>
            <div>
                <div class="brand-name">RAG Studio</div>
                <div class="brand-description">知识库助手</div>
            </div>
        </header>

        <button class="new-chat-button" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
            </svg>
            <span>新建对话</span>
        </button>

        <label class="search-box">
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6" />
                <path d="m16 16 4 4" />
            </svg>
            <input type="search" placeholder="搜索对话" />
        </label>

        <div class="conversation-history">
            <section
                v-for="group in conversationGroups"
                :key="group.label"
                class="conversation-group"
            >
                <h2 class="group-title">{{ group.label }}</h2>
                <button
                    v-for="conversation in group.conversations"
                    :key="conversation"
                    class="conversation-item"
                    :class="{ active: conversation === '基于知识库的问答设计' }"
                    type="button"
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 6.5h14v10H9l-4 3v-13Z" />
                    </svg>
                    <span>{{ conversation }}</span>
                </button>
            </section>
        </div>

        <footer class="sidebar-footer">
            <RouterLink :to="{ name: 'documents' }" class="document-link">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 3h9l3 3v15H6V3Z" />
                    <path d="M15 3v4h4M9 11h6M9 15h6" />
                </svg>
                <span>文档管理</span>
                <svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m9 6 6 6-6 6" />
                </svg>
            </RouterLink>
        </footer>
    </aside>
</template>

<style scoped>
.sidebar {
    display: flex;
    width: 288px;
    flex: 0 0 288px;
    flex-direction: column;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
}

.sidebar-header {
    display: flex;
    height: 72px;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    border-bottom: 1px solid var(--color-border);
}

.brand-mark {
    display: grid;
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    place-items: center;
    color: var(--color-text-inverse);
    background: var(--color-accent);
    font-size: 17px;
    font-weight: 700;
}

.brand-name {
    font-size: 15px;
    font-weight: 700;
    line-height: 1.4;
}

.brand-description {
    color: var(--color-text-muted);
    font-size: 12px;
    line-height: 1.4;
}

.new-chat-button,
.conversation-item {
    width: 100%;
    border: 0;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.new-chat-button {
    display: flex;
    height: 42px;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin: 16px 16px 10px;
    width: calc(100% - 32px);
    color: var(--color-text-inverse);
    background: var(--color-accent);
    font-size: 14px;
    font-weight: 600;
}

.new-chat-button:hover {
    background: var(--color-accent-hover);
}

.new-chat-button:active {
    background: var(--color-accent-active);
}

.new-chat-button svg,
.search-box svg,
.conversation-item svg,
.document-link svg {
    width: 18px;
    height: 18px;
    flex: 0 0 18px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.7;
}

.search-box {
    display: flex;
    height: 40px;
    align-items: center;
    gap: 9px;
    margin: 0 16px 14px;
    padding: 0 12px;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    background: var(--color-surface-subtle);
}

.search-box:focus-within {
    border-color: var(--color-border-strong);
    box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.search-box input {
    width: 100%;
    min-width: 0;
    color: var(--color-text-primary);
    border: 0;
    outline: 0;
    background: transparent;
    font: inherit;
    font-size: 13px;
}

.search-box input::placeholder {
    color: var(--color-text-muted);
}

.conversation-history {
    min-height: 0;
    flex: 1;
    padding: 0 8px 12px;
    overflow-y: auto;
}

.conversation-group + .conversation-group {
    margin-top: 16px;
}

.group-title {
    padding: 0 10px 6px;
    color: var(--color-text-muted);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
}

.conversation-item {
    display: flex;
    height: 40px;
    align-items: center;
    gap: 10px;
    padding: 0 10px;
    color: var(--color-text-secondary);
    background: transparent;
    font-size: 13px;
}

.conversation-item + .conversation-item {
    margin-top: 4px;
}

.conversation-item span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.conversation-item:hover {
    color: var(--color-text-primary);
    background: var(--color-surface-subtle);
}

.conversation-item.active {
    color: var(--color-text-primary);
    background: var(--color-highlight);
    font-weight: 600;
}

.sidebar-footer {
    padding: 8px;
    border-top: 1px solid var(--color-border);
}

.document-link {
    display: flex;
    height: 44px;
    align-items: center;
    gap: 10px;
    padding: 0 10px;
    color: var(--color-text-secondary);
    text-decoration: none;
}

.document-link:hover {
    color: var(--color-text-primary);
    background: var(--color-surface-subtle);
}

.document-link span {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
}

.document-link .arrow-icon {
    width: 16px;
    height: 16px;
}
</style>
