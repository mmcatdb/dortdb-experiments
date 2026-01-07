import { type DocumentTable, type SimpleFileSchema, type TableSchema } from '@/types/schema';

export function copyTableDef(files: SimpleFileSchema[], key: string): TableSchema {
    const file = files.find(f => f.key === key);
    if (!file || file.type !== 'csv')
        throw new Error(`File with key "${key}" not found or is not a CSV file.`);

    return {
        type: 'table',
        key: file.key,
        columns: file.columns,
    };
}

export function extractTablesFromDocument(schema: DocumentTable): TableSchema[] {
    const { name, columns, fromParent, children } = schema;

    const table: TableSchema = { type: 'table', key: name, columns: [ ...columns ] };
    if (fromParent) {
        for (const column of fromParent)
            table.columns.push(column);
    }

    const tables = [ table ];

    if (children) {
        for (const child of children)
            tables.push(...extractTablesFromDocument(child));
    }

    return tables;
}

type ItemAccessor<T> = (item: T) => {
    key: string;
    dependencies: string[];
};

export function topologicalSort<T>(items: T[], accessor: ItemAccessor<T>): T[] {
    const sortedKeys: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const normalizedItems = items.map(item => accessor(item));
    const keyMap = new Map(normalizedItems.map(item => [ item.key, item ]));

    function visit(key: string) {
        if (visited.has(key) || visiting.has(key))
            // Cycle detection.
            return;

        visiting.add(key);
        const item = keyMap.get(key);
        if (!item)
            throw new Error(`Item with key "${key}" not found.`);

        item.dependencies.forEach(dependentKey => visit(dependentKey));

        visiting.delete(key);
        visited.add(key);

        sortedKeys.push(key);
    };

    normalizedItems.forEach(item => visit(item.key));

    return sortedKeys.map(key => items.find(i => accessor(i).key === key)!);
}
