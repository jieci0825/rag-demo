<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
    <div class="chat-page">
        <aside class="sidebar">
            <div class="sidebar-header box">品牌区域</div>

            <div class="conversation-actions">
                <div class="action-box box">新建对话</div>
                <div class="action-box box">搜索对话</div>
            </div>

            <div class="conversation-history box">
                <div class="section-title">历史对话</div>
                <div class="conversation-list">
                    <div class="conversation-item box">对话记录 1</div>
                    <div class="conversation-item box">对话记录 2</div>
                    <div class="conversation-item box">对话记录 3</div>
                    <div class="conversation-item box">对话记录 4</div>
                </div>
            </div>

            <div class="sidebar-footer box">
                <RouterLink :to="{ name: 'documents' }">文档管理</RouterLink>
            </div>
        </aside>

        <main class="chat-main">
            <header class="chat-header box">
                <div class="chat-title box">当前对话标题</div>
                <div class="document-status box">文档连接状态</div>
            </header>

            <div class="chat-content box">
                <div class="message-list">
                    <div class="user-message-row box">
                        <div class="user-message box">用户消息</div>
                        <div class="avatar box">用户头像</div>
                    </div>

                    <div class="assistant-message-row box">
                        <div class="avatar box">AI 头像</div>
                        <div class="assistant-content">
                            <div class="assistant-message box">AI 回复内容</div>
                            <div class="reference-section box">
                                <div class="section-title">引用来源</div>
                                <div class="reference-card box">引用文档卡片</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer class="chat-footer box">
                <div class="chat-input-wrapper box">
                    <div class="chat-input">输入区域</div>
                    <div class="send-button box">发送</div>
                </div>
                <div class="answer-notice box">回答提示区域</div>
            </footer>
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
}

.box {
    border: 1px solid #000;
}

.sidebar {
    display: flex;
    flex: 0 0 320px;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    border: 2px solid #000;
}

.sidebar-header {
    height: 72px;
    padding: 16px;
}

.conversation-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.action-box {
    height: 44px;
    padding: 12px;
}

.conversation-history {
    flex: 1;
    padding: 12px;
}

.section-title {
    margin-bottom: 12px;
}

.conversation-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.conversation-item {
    height: 56px;
    padding: 16px;
}

.sidebar-footer {
    height: 56px;
    padding: 16px;
}

.sidebar-footer a {
    color: #000;
}

.chat-main {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    gap: 8px;
    border: 2px solid #000;
}

.chat-header {
    display: flex;
    height: 72px;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
}

.chat-title,
.document-status {
    padding: 10px 16px;
}

.chat-content {
    min-height: 0;
    flex: 1;
    padding: 32px;
    overflow-y: auto;
}

.message-list {
    display: flex;
    max-width: 900px;
    margin: 0 auto;
    flex-direction: column;
    gap: 32px;
}

.user-message-row {
    display: flex;
    align-items: center;
    align-self: flex-end;
    gap: 12px;
    padding: 12px;
}

.user-message,
.assistant-message {
    min-width: 260px;
    padding: 20px;
}

.avatar {
    display: flex;
    width: 64px;
    height: 64px;
    align-items: center;
    justify-content: center;
    text-align: center;
}

.assistant-message-row {
    display: flex;
    gap: 12px;
    padding: 12px;
}

.assistant-content {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 12px;
}

.reference-section {
    padding: 12px;
}

.reference-card {
    min-height: 88px;
    padding: 20px;
}

.chat-footer {
    display: flex;
    min-height: 128px;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
    padding: 16px 32px;
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
    padding: 12px 20px;
}

.answer-notice {
    padding: 6px 16px;
}
</style>
