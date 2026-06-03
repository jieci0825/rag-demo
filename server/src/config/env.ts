import { config } from 'dotenv'
import { z } from 'zod'

config()

const envSchema = z.object({
    PORT: z.coerce.number().int().positive(),
    DATABASE_URL: z.string().url(),
    EMBEDDING_MODEL: z.string().min(1),
    EMBEDDING_DIM: z.coerce.number().int().positive(),
    LLM_MODEL: z.string(),
})

export const env = envSchema.parse(process.env)

export type Env = z.infer<typeof envSchema>
