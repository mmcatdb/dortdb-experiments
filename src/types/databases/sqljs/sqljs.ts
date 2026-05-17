import { type Result, rowsToObjects, successResult, type Database, errorResult, csvRowToSql, type PlanNode, type QueryOutput, type ExampleQueries } from '../../database';
import initSqlJs from 'sql.js';
import { type TableSchema, type DatasourceData, type DatasourceSchema } from '../../schema';
import { createPreparedInsertStatement, createSqliteSchema, type ExplainSqlObject, queryPlanToTree } from '../../sqlite';
import { unibenchExamples } from './unibenchExamples';
import { tpchExamples } from './tpchExamples';

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
        const { tables, statements } = createSqliteSchema(schema, 'sqlite');
        const sqlScript = statements.join('\n');
        this.innerDb.run(sqlScript);

        const steps = tables.length + 1;
        let step = 1;

        for (const table of tables) {
            await onProgress?.(step++ / steps);
            this.insertTableData(table, data);
        }
    }

    private insertTableData(table: TableSchema, data: DatasourceData): void {
        const tableData = data.relational[table.key];
        if (!tableData)
            throw new Error(`No data found for table "${table.key}".`);

        console.log(`[${this.type}] Inserting data into "${table.key}"`, tableData.length);
        const statement = this.innerDb.prepare(createPreparedInsertStatement(table));

        for (const row of tableData)
            statement.run(csvRowToSql(row, table.columns));

        statement.free();
    }

    query(sql: string): Result<QueryOutput> {
        try {
            const result = this.innerDb.exec(sql);
            // A list of results is returned (one for each statement executed). However, for some un-fucking-believable reason, if there are no rows, the result is skipped.
            // Unbelievable.
            if (result.length === 0)
                return successResult({ columns: [], rows: [] });

            const { columns, values } = result[0];
            const rows = rowsToObjects(columns, values);

            return successResult({ columns, rows });
        }
        catch (error) {
            return errorResult(error);
        }
    }

    getDefaultQuery(): string {
        return defaultQuery;
    }

    getExamples(): ExampleQueries {
        return examples;
    }

    explain(sql: string): Result<PlanNode> {
        try {
            const planSql = `EXPLAIN QUERY PLAN ${sql}`;
            const result = this.innerDb.exec(planSql);
            if (result.length === 0)
                return errorResult('No EXPLAIN output.');

            const { columns, values } = result[0];
            const plan = queryPlanToTree(rowsToObjects(columns, values) as ExplainSqlObject[]);
            return successResult(plan);
        }
        catch (error) {
            return errorResult(error);
        }
    }
}

const defaultQuery = `
-- Retrieve all records from the customers table
SELECT * FROM customers
LIMIT 2
`.trim();

const examples: ExampleQueries = {
    tpch: tpchExamples,
    unibench: unibenchExamples,
};
