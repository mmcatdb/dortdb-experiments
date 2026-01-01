import { type ColumnDef, ColumnType, type CsvRow, type DatasourceData, type DatasourceSchema } from './schema';

export type Database = {
    readonly type: string;

    /**
     * If needed, creates tables for the schema (if they already exist, they are dropped first).
     * Sets data for the tables / some other internal structures.
     */
    setData(schema: DatasourceSchema, data: DatasourceData): void;

    query(sql: string, defaultLanguage?: DortdbLanguage): Result<SqlTuple[]>;

    getDefaultQuery(): string;

    getExamples?(): ExampleQuery[];
};

export type DortdbLanguage = 'sql' | 'cypher' | 'xquery';

export type ExampleQuery = {
    name: string;
    query: string;
    defaultLanguage?: DortdbLanguage;
};

export type SqlRow = SqlValue[];
export type SqlTuple = Record<string, SqlValue>;
export type SqlValue = number | string | Uint8Array | null;

export function csvRowToSql(row: CsvRow, columns: ColumnDef[]): SqlRow {
    const sqlRow: SqlRow = new Array(columns.length);

    for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        const value = row[column.name];

        if (value === undefined)
            throw new Error(`Column "${column.name}" not found in CSV row.`);
        else if (column.type === ColumnType.date)
            sqlRow[i] = (value as Date).toISOString();
        else
            sqlRow[i] = value as SqlValue;
    }

    return sqlRow;
}

export function rowsToObjects(columns: string[], rows: SqlRow[]): SqlTuple[] {
    const objects: SqlTuple[] = [];

    for (const row of rows) {
        const object: SqlTuple = {};

        for (let i = 0; i < columns.length; i++)
            object[columns[i]] = row[i];

        objects.push(object);
    }

    return objects;
}

export type Result<T> = {
    status: true;
    data: T;
} | {
    status: false;
    error: unknown;
};

export function successResult<T>(data: T): Result<T> {
    return { status: true, data };
}

export function errorResult<T>(error: unknown): Result<T> {
    return { status: false, error };
}
