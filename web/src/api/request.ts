import { createRequest } from '@coderjc/reqflow'
import { fetchAdapter } from '@coderjc/reqflow/adapters/fetch'
import { errorPlugin } from '@coderjc/reqflow/plugins'

const request = createRequest({
    adapter: fetchAdapter(),
    plugins: [
        errorPlugin({
            /** 输出统一请求错误。 */
            onError: error => {
                console.error('Request error:', error)

                // throw new Error(error.message)
            },
        }),
    ],
})

export interface ApiResponse<T> {
    errorCode: number
    message: string
    data: T
}

export default request
