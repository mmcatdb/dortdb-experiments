import type { Database, TableData, TableSchema } from './common';

export function setupDatabase(db: Database) {
    db.setSchema(DB_SCHEMA);

    for (const tableName in DB_DATA)
        db.setData(tableName, DB_DATA[tableName]);
}

export const DB_SCHEMA: TableSchema[] = [ {
    name: 'hello',
    columns: [
        { name: 'a', type: 'int' },
        { name: 'b', type: 'char' },
    ],
} ];

export const DB_DATA: Record<string, TableData> = {
    hello: [
        [ 0, 'hello' ],
        [ 1, 'world' ],
    ],
};

export type ColumnDef = {
    name: string;
    type: ColumnType;
};

export enum ColumnType {
    string = 'string',
    int = 'int',
    real = 'real',
    date = 'date',
}
