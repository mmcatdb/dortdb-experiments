import { type Result, rowsToObjects, successResult, type Database, type SqlTuple, errorResult, csvRowToSql, type ExampleQuery } from '../database';
import initSqlJs from 'sql.js';
import { type TableSchema, type DatasourceData, type DatasourceSchema } from '../schema';
import { extractTablesFromDocument } from '@/data/utils';

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

    async setData(schema: DatasourceSchema, data: DatasourceData, onProgress?: (progress: number) => Promise<void>): Promise<void> {
        const tables = [ ...schema.common, ...schema.relationalOnly ].flatMap(
            kind => kind.type === 'table' ? [ kind ] : extractTablesFromDocument(kind.root),
        );

        this.createTables(tables);

        const steps = tables.length + 1;
        let step = 1;

        for (const table of tables) {
            await onProgress?.(step++ / steps);
            this.insertTableData(table, data);
        }
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
        return sqlQueryExamples;
    }
}

const defaultQuery = `
-- Retrieve all records from the customers table
SELECT * FROM customers
LIMIT 2
`.trim();

export const sqlQueryExamples: ExampleQuery[] = [ {
    name: 'Query 1',
    query: `
-- all data about CUSTOMER
--
-- one such customer id is 4145

-- TODO Not sure how to query multiple results at once ...

SELECT *
FROM customers WHERE id = 4145
    `,
}, {
    name: 'Query 2',
    query: `
-- customers which bought PRODUCT and posted about it
--
-- one such product id is 52

SELECT customers.id, customers.firstName
FROM customers
JOIN hasCreator ON hasCreator.PersonId = customers.id
JOIN posts ON posts.id = hasCreator.PostId
JOIN hasTag ON hasTag.PostId = posts.id
JOIN orders ON orders.PersonId = customers.id
JOIN Orderline ON orders.OrderId = Orderline.OrderId
WHERE hasTag.TagId = 52
AND Orderline.productId = 52
    `,
}, {
    name: 'Query 3',
    query: `
-- customers which posted about PRODUCT and left negative feedback
--
-- the only such product in the dataset is 202

SELECT customers.id, feedback.feedback, products.productId
FROM customers
JOIN feedback ON customers.id = feedback.personId
JOIN products ON feedback.productAsin = products.asin
WHERE products.productId = 202
AND CAST(SUBSTR(feedback.feedback, 2, INSTR(feedback.feedback, ',') - 2) AS REAL) < 3
AND customers.id IN (
    SELECT hasCreator.PersonId
    FROM hasTag
    JOIN posts ON posts.id = hasTag.PostId
    JOIN hasCreator ON hasCreator.PostId = posts.id
    WHERE hasTag.TagId = products.productId
)
    `,
}, {
    name: 'Query 4',
    query: `
-- TODO
-- Includes graph paths with variable lengths so I think we can pass on this one.
    `,
}, {
    name: 'Query 5',
    query: `
-- what did the friends of CUSTOMER which bought BRAND products post about?
--
-- example customer id: 4659
-- example brand: Reebok

SELECT TagId
FROM hasTag
JOIN hasCreator ON hasCreator.PostId = hasTag.PostId
JOIN knows ON knows.\`to\` = hasCreator.PersonId
JOIN invoices ON invoices.PersonId = knows.\`to\`
JOIN InvoiceLine ON InvoiceLine.OrderId = invoices.OrderId
WHERE knows.\`from\` = 4659
AND InvoiceLine.brand = 'Reebok'
GROUP BY TagId
    `,
}, {
    name: 'Query 6',
    query: `
-- TODO
-- Again, path query, skip.
    `,
}, {
    name: 'Query 7',
    query: `
-- TODO
    `,
}, {
    name: 'Query 8',
    query: `
-- TODO
    `,
}, {
    name: 'Query 9',
    query: `
-- TODO
    `,
}, {
    name: 'Query 10',
    query: `
-- TODO
    `,
} ].map(example => ({
    name: example.name,
    query: example.query.trim(),
    defaultLanguage: 'sql',
}));
