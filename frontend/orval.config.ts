import { defineConfig } from 'orval';

export default defineConfig({
    backendApi: {
        input: './src/api/openapi.json',
        output: {
            mode: 'tags',
            target: './src/api/generated/openapi/api.ts',
            schemas: './src/api/generated/openapi/model',
            client: 'react-query',
            httpClient: 'axios',
            override: {
                mutator: {
                    path: './src/api/axios-instance.ts',
                    name: 'customInstance',
                },
            },
        },
    },
});
