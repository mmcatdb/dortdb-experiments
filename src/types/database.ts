export type Database = {
    readonly type: string;

    /**
     * Creates the database schema (if needed).
     * If the schema already exists, it's dropped first.
     */
    setSchema(schema: TableSchema[]): void;

    /**
     * Sets the data for the table. If the data already exists, it is replaced.
     */
    setData(tableName: string, data: TableData): void;

    setRawData?(tableName: string, data: unknown): void;

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

export type SqlValue = number | string | Uint8Array | null;

/** An array of rows. A row is an array of values. */
export type TableData = SqlValue[][];

export type TableSchema = {
    name: string;
    columns: {
        name: string;
        type: string;
        references?: {
            table: string;
            column: string;
        };
    }[];
    // TODO
    // indexes: {
    //     name: string;
    //     columns: string[];
    //     unique: boolean;
    // }[];
};

export type SqlTuple = Record<string, SqlValue>;

export function rowsToObjects(columns: string[], rows: TableData): SqlTuple[] {
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
