import { config } from 'dotenv'
import { z } from 'zod'

config()

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production']).default('development'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
    PORT: z.coerce.number().int().positive(),
    DATABASE_URL: z.string().url(),
    OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
    EMBEDDING_MODEL: z.string().min(1),
    EMBEDDING_DIM: z.coerce.number().int().positive(),
    RERANKER_BASE_URL: z.string().url().default('http://localhost:8001'),
    RERANKER_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
    DEEPSEEK_BASE_URL: z.string().url().default('https://api.deepseek.com'),
    DEEPSEEK_API_KEY: z.string().min(1),
})

export const env = envSchema.parse(process.env)

export type Env = z.infer<typeof envSchema>
