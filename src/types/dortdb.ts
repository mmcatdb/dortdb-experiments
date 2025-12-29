import { type Result, rowsToObjects, successResult, type Database, type SqlTuple, type TableData, type TableSchema, errorResult } from './common';
import { DortDB } from '@dortdb/core';
import { defaultRules } from '@dortdb/core/optimizer';
import { SQL } from '@dortdb/lang-sql';

export class Dortdb implements Database {
    readonly type = 'DortDB';
    private readonly innerDb: DortDB;

    constructor() {
        this.innerDb = new DortDB({
            mainLang: SQL(),
            optimizer: {
                rules: defaultRules,
            },
        });
    }

    private schema: TableSchema[] | undefined;

    setSchema(schema: TableSchema[]): void {
        // For DortDB, schema is inferred from the queries, so no action is needed here.
        // However, we need it to create indexes later.
        this.schema = schema;
    }

    setData(tableName: string, data: TableData): void {
        const tableSchema = this.schema?.find(t => t.name === tableName);
        if (!tableSchema)
            throw new Error('Schema for table ' + tableName + ' not found.');

        const columns = tableSchema.columns.map(column => column.name);

        const objects = rowsToObjects(columns, data);

        this.innerDb.registerSource([ tableName ], objects);
    }

    query(sql: string): Result<SqlTuple[]> {
        try {
            return successResult(this.innerDb.query<SqlTuple>(sql).data);
        }
        catch (error) {
            return errorResult(error);
        }
    }
}
