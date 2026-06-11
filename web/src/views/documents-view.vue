<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
    <main>
        <h1>文档管理</h1>
        <RouterLink :to="{ name: 'home' }">返回首页</RouterLink>
    </main>
</template>
