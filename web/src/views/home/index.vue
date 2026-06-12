<script setup lang="ts">
import ChatContent from './components/chat-content.vue'
import ChatFooter from './components/chat-footer.vue'
import ChatHeader from './components/chat-header.vue'
import ChatSidebar from './components/chat-sidebar.vue'
</script>

<template>
    <div class="chat-page">
        <ChatSidebar />

        <main class="chat-main">
            <ChatHeader />
            <ChatContent />
            <ChatFooter />
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
    border: 2px solid var(--color-border-strong);
    background: var(--color-surface);
}
</style>
