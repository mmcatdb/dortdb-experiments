import { type ColumnDef, ColumnType, type CsvRow, type DatasourceData, type DatasourceSchema, type JsonObject, type JsonValue } from './schema';

export type Database = {
    readonly type: string;

    /**
     * If needed, creates tables for the schema (if they already exist, they are dropped first).
     * Sets data for the tables / some other internal structures.
     */
    setData(schema: DatasourceSchema, data: DatasourceData, onProgress?: (progress: number) => Promise<void>): Promise<void>;

    query(sql: string, defaultLanguage?: DortdbLanguage): Result<QueryOutput>;

    getDefaultQuery(): string;

    getExamples?(): ExampleQuery[];

    explain?(sql: string, defaultLanguage?: DortdbLanguage): Result<PlanNode>;
};

export type DortdbLanguage = 'sql' | 'cypher' | 'xquery';

export type ExampleQuery = {
    name: string;
    query: string;
    defaultLanguage?: DortdbLanguage;
};


export type SqlRow = SqlValue[];
export type SqlObject = Record<string, SqlValue>;
export type SqlValue = number | string | Uint8Array | null;

export type QueryOutput = {
    columns: string[];
    rows: QueryOutputObject[];
};

export type QueryOutputObject = { [key: string]: QueryOutputValue };
export type QueryOutputValue = SqlValue | Date | QueryOutputObject | QueryOutputValue[] | null;

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

export function rowsToObjects(columns: string[], rows: SqlRow[]): SqlObject[] {
    const objects: SqlObject[] = [];

    for (const row of rows) {
        const object: SqlObject = {};

        for (let i = 0; i < columns.length; i++)
            object[columns[i]] = row[i];

        objects.push(object);
    }

    return objects;
}

export function objectsToRows(columns: string[], objects: SqlObject[]): SqlRow[] {
    const rows: SqlRow[] = [];

    for (const object of objects) {
        const row: SqlRow = [];

        for (const column of columns)
            row.push(object[column]);

        rows.push(row);
    }

    return rows;
}

export type PlanNode = {
    label: string;
    children: PlanNode[];
};

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

export function stringifyQueryOutputObject(object: QueryOutputObject): string {
    // The point is to parse all top-level JSON strings and then stringify the whole object again.
    // We don't expect nested JSON strings here.
    const toJson: Record<string, unknown> = {};

    for (const [ key, value ] of Object.entries(object)) {
        toJson[key] = typeof value === 'string'
            ? parseJsonIfNeeded(value) ?? value
            : value;
    }

    return JSON.stringify(toJson, null, 4);
}

function parseJsonIfNeeded(value: string): JsonObject | JsonValue[] | undefined {
    if (
        (value.length < 2) ||
        (value[0] !== '{' && value[0] !== '[') ||
        (value[value.length - 1] !== '}' && value[value.length - 1] !== ']')
    )
        return undefined;

    try {
        const parsed = JSON.parse(value);
        return (typeof parsed === 'object' && parsed !== null) ? parsed : undefined;
    }
    catch {
        return undefined;
    }
}

export function stringifyQueryOutputValue(value: QueryOutputValue): string {
    switch (typeof value) {
    case 'string':
        return value;
    case 'number':
    case 'boolean':
        return value.toString();
    default:
        return JSON.stringify(value);
    }
}
