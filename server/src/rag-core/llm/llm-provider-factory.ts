import { createDeepSeekLlmProvider } from './deepseek-llm.provider.js'

import type { LlmProvider, LlmProviderName } from './llm.provider.js'

/**
 * 根据提供商名称创建对应的大模型 Provider。
 */
export function createLlmProvider(provider: LlmProviderName): LlmProvider {
    switch (provider) {
        case 'deepseek':
            return createDeepSeekLlmProvider()
    }
}
