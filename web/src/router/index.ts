import { createRouter, createWebHistory } from 'vue-router'

import DocumentsView from '../views/documents-view.vue'
import HomeView from '../views/home/index.vue'

export const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
        },
        {
            path: '/documents',
            name: 'documents',
            component: DocumentsView,
        },
    ],
})
