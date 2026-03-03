import { defineConfig } from 'orval';

export default defineConfig({
    backendApi: {
        input: './src/api/openapi.json',
        output: {
            mode: 'tags-split',
            target: './src/api/generated/api.ts',
            schemas: './src/api/generated/model',
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
