import { type Result, rowsToObjects, successResult, type Database, type SqlTuple, errorResult, csvRowToSql, type ExampleQuery } from '../database';
import initSqlJs from 'sql.js';
import { type TableSchema, type DatasourceData, type DatasourceSchema } from '../schema';

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

    setData(schema: DatasourceSchema, data: DatasourceData): void {
        const tables = [ ...schema.common, ...schema.relationalOnly ];

        this.createTables(tables);

        for (const table of tables)
            this.insertTableData(table, data);
    }

    private createTables(tables: TableSchema[]): void {
        for (const table of tables) {
            const columnDefs = table.columns.map(col => `"${col.name}" ${col.type}`).join(', ');
            this.innerDb.run(`DROP TABLE IF EXISTS "${table.key}";`);
            const createTableSQL = `CREATE TABLE "${table.key}" (${columnDefs});`;
            this.innerDb.run(createTableSQL);
        }

        // TODO references + indexes
    }

    private insertTableData(table: TableSchema, data: DatasourceData): void {
        const tableData = data.relational[table.key];
        if (!tableData)
            throw new Error(`No data found for table "${table.key}".`);

        const columnDefs = table.columns.map(() => '?').join(', ');
        const statement = this.innerDb.prepare(`INSERT INTO "${table.key}" VALUES (${columnDefs});`);

        for (const row of tableData)
            statement.run(csvRowToSql(row, table.columns));

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
        return defaultQuery;
    }

    getExamples(): ExampleQuery[] {
        return examples;
    }
}

const defaultQuery = `
-- Retrieve all records from the customers table
SELECT * FROM customers
LIMIT 2
`.trim();

const examples: ExampleQuery[] = [ `
-- TODO
SELECT * FROM customers WHERE id = 4145
`, `
SELECT customers.id, customers.firstName FROM customers
JOIN hasCreator ON hasCreator.PersonId = customers.id
JOIN posts ON posts.id = hasCreator.PostId
JOIN hasTag ON hasTag.PostId = posts.id
WHERE hasTag.TagId = 52
-- TODO orders
` ].map((example, index) => ({
    name: `Query ${index + 1}`,
    query: example.trim(),
    defaultLanguage: 'sql',
}));
