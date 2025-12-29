import { type Result, successResult, type Database, type SqlTuple, type TableData, type TableSchema, errorResult } from './common';
import alasqlRaw from 'alasql';

// This is ugly but alasql uses commonjs modules and interface augmentation doesn't work.
type AlaSQL = typeof alasqlRaw & {
    compile<T = unknown>(sql: string): (...params: any[]) => T;
};

const alasql = alasqlRaw as AlaSQL;

export class Alasql implements Database {
    readonly type = 'AlaSQL';
    static nextId = 0;
    private readonly innerDbId: string;

    constructor() {
        this.innerDbId = 'db-' + Alasql.nextId++;
        // Kinda not ideal but the inner typings of alasql are beyond insanity.
        new alasql.Database(this.innerDbId);
    }

    private schema: TableSchema[] | undefined;

    setSchema(schema: TableSchema[]): void {
        this.schema = schema;

        alasql.use(this.innerDbId);

        for (const table of schema) {
            const columnDefs = table.columns.map(col => `\`${col.name}\` ${col.type}`).join(', ');
            alasql(`DROP TABLE IF EXISTS \`${table.name}\`;`);
            const createTableSQL = `CREATE TABLE \`${table.name}\` (${columnDefs});`;
            alasql(createTableSQL);
        }

        // TODO references + indexes
    }

    setData(tableName: string, data: TableData): void {
        const tableSchema = this.schema?.find(t => t.name === tableName);
        if (!tableSchema)
            throw new Error('Schema for table ' + tableName + ' not found.');

        alasql.use(this.innerDbId);

        const columnDefs = tableSchema.columns.map(() => '?').join(', ');
        const insert = alasql.compile(`INSERT INTO \`${tableName}\` VALUES (${columnDefs});`);

        for (const row of data)
            insert(row);
    }

    query(sql: string): Result<SqlTuple[]> {
        try {
            alasql.use(this.innerDbId);
            return successResult(alasql<SqlTuple[]>(sql));
        }
        catch (error) {
            return errorResult(error);
        }
    }
}
