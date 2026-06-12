<template>
    <div class="chat-content">
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
</template>

<style scoped>
.box {
    border: 1px solid var(--color-border);
}

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

.user-message {
    background: var(--color-highlight);
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

.section-title {
    margin-bottom: 12px;
}

.reference-card {
    min-height: 88px;
    padding: 20px;
    background: var(--color-surface-subtle);
}
</style>
