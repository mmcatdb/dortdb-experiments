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
