import { type Result, successResult, type Database, type SqlTuple, errorResult, csvRowToSql } from '../database';
import alasqlRaw from 'alasql';
import { type DatasourceData, type DatasourceSchema, type TableSchema } from '../schema';

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

    setData(schema: DatasourceSchema, data: DatasourceData): void {
        alasql.use(this.innerDbId);

        const tables = [ ...schema.common, ...schema.relationalOnly ];

        this.createTables(tables);

        for (const table of tables)
            this.insertTableData(table, data);
    }

    private createTables(tables: TableSchema[]): void {
        for (const table of tables) {
            const columnDefs = table.columns.map(col => `\`${col.name}\` ${col.type}`).join(', ');
            alasql(`DROP TABLE IF EXISTS \`${table.key}\`;`);
            const createTableSQL = `CREATE TABLE \`${table.key}\` (${columnDefs});`;
            alasql(createTableSQL);
        }

        // TODO references + indexes
    }

    private insertTableData(table: TableSchema, data: DatasourceData): void {
        const tableData = data.relational[table.key];
        if (!tableData)
            throw new Error(`No data found for table "${table.key}".`);

        const columnDefs = table.columns.map(() => '?').join(', ');
        const insert = alasql.compile(`INSERT INTO \`${table.key}\` VALUES (${columnDefs});`);

        for (const row of tableData)
            insert(csvRowToSql(row, table.columns));
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

    getDefaultQuery(): string {
        return 'SELECT * FROM hello WHERE a = 1 AND b = \'world\'';
    }
}
