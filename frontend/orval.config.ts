import { defineConfig } from 'orval';
import specs from './src/api/openapi.json';

const getPaginatedOperations = () => {
    const operations: Record<string, any> = {};

    Object.values(specs.paths as Record<string, any>).forEach((pathMethods: any) => {
        Object.values(pathMethods).forEach((operation: any) => {
            const hasPageParam = operation.parameters?.some(
                (p: any) => p.name === 'page' && p.in === 'query'
            );

            if (hasPageParam && operation.operationId) {
                operations[operation.operationId] = {
                    query: {
                        useInfinite: true,
                        useInfiniteQueryParam: 'page',
                        options: {
                            getNextPageParam: (lastPage: any) =>
                                lastPage?.page < lastPage?.totalPages
                                    ? lastPage.page + 1
                                    : undefined,
                            initialPageParam: 1
                        }
                    }
                };
            }
        });
    });

    return operations;
};

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
                operations: getPaginatedOperations()
            },
        },
    },
});
