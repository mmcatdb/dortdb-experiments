import { type Result, rowsToObjects, successResult, type Database, type SqlTuple, type TableData, type TableSchema, errorResult } from '../database';
import initSqlJs from 'sql.js';

const SQL = await initSqlJs({
    // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want.
    // You can omit locateFile completely when running in node.
    // locateFile: file => `https://sql.js.org/dist/${file}`,
    // Files in the public directory are served at the root path - so we can use just the filename instead of public/filename
    locateFile: file => file,
});

export class Sqljs implements Database {
    readonly type = 'sql.js';
    private readonly innerDb: initSqlJs.Database;

    constructor() {
        this.innerDb = new SQL.Database();
    }

    private schema: TableSchema[] | undefined;

    setSchema(schema: TableSchema[]): void {
        this.schema = schema;

        for (const table of schema) {
            const columnDefs = table.columns.map(col => `"${col.name}" ${col.type}`).join(', ');
            this.innerDb.run(`DROP TABLE IF EXISTS "${table.name}";`);
            const createTableSQL = `CREATE TABLE "${table.name}" (${columnDefs});`;
            this.innerDb.run(createTableSQL);
        }

        // TODO references + indexes
    }

    setData(tableName: string, data: TableData): void {
        const tableSchema = this.schema?.find(t => t.name === tableName);
        if (!tableSchema)
            throw new Error('Schema for table ' + tableName + ' not found.');

        const columnDefs = tableSchema.columns.map(() => '?').join(', ');
        const statement = this.innerDb.prepare(`INSERT INTO "${tableName}" VALUES (${columnDefs});`);

        for (const row of data)
            statement.run(row);

        statement.free();
    }

    query(sql: string): Result<SqlTuple[]> {
        try {
            const { columns, values } = this.innerDb.exec(sql)[0];
            return successResult(rowsToObjects(columns, values));
        }
        catch (error) {
            return errorResult(error);
        }
    }

    getDefaultQuery(): string {
        return 'SELECT * FROM hello WHERE a = 1 AND b = \'world\'';
    }
}
