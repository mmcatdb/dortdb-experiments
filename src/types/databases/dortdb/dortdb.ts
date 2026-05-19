import { type Result, successResult, type Database, errorResult, type DortdbLanguage, type PlanNode, type QueryOutputObject, type QueryOutput, type ExampleQueries } from '../../database';
import { DortDB, MapIndex, allAttrs } from '@dortdb/core';
import { datetime } from '@dortdb/datetime';
import { defaultRules } from '@dortdb/core/optimizer';
import { SQL } from '@dortdb/lang-sql';
import { ConnectionIndex, Cypher } from '@dortdb/lang-cypher';
import { XQuery } from '@dortdb/lang-xquery';
import { type DatasourceData, type DatasourceSchema } from '../../schema';
import { queryPlanToTree } from './queryPlanToTree';
import { unibenchExamples } from './unibenchExamples';
import { tpchExamples } from './tpchExamples';

export class Dortdb implements Database {
    readonly type = 'DortDB';
    private readonly innerDb: DortDB;

    constructor() {
        this.innerDb = new DortDB({
            mainLang: SQL(),
            additionalLangs: [
                Cypher({ defaultGraph: 'defaultGraph' }),
                XQuery(),
            ],
            optimizer: {
                rules: defaultRules,
            },
            extensions: [ datetime ],
            executor: { hashJoinIndices: [ MapIndex ] },
        });
    }

    async setData(schema: DatasourceSchema, data: DatasourceData, onProgress?: (progress: number) => Promise<void>): Promise<void> {
        const kinds = [ ...schema.common, ...schema.multimodelOnly ];

        for (const kind of kinds) {
            const kindData = data.multimodel[kind.key];
            if (!kindData)
                throw new Error(`No data found for kind "${kind.key}".`);

            this.innerDb.registerSource([ kind.key ], kindData);
        }

        await onProgress?.(1 / 2);

        for (const kind of kinds) {
            switch (kind.type) {
            case 'table':
                kind.columns
                    .filter(col => col.isPrimaryKey || col.references || col.isUnique)
                    .forEach(col => {
                        this.innerDb.createIndex([ kind.key ], [ col.name ], MapIndex);
                    });
                break;
            case 'document':
                for (const index of kind.indexes ?? [])
                    this.innerDb.createIndex([ kind.key ], [ index ], MapIndex);
                break;
            case 'graph': {
                this.innerDb.createIndex([ kind.key, 'nodes' ], [], ConnectionIndex);
                this.innerDb.createIndex([ kind.key, 'nodes' ], [ 'x.id' ], MapIndex, { fromItemKey: [ 'x' ], mainLang: 'cypher' });
                this.innerDb.createIndex([ kind.key, 'edges' ], [], ConnectionIndex);
                break;
            }
            }
        }
    }

    setRawData(kindName: string, data: unknown): void {
        this.innerDb.registerSource([ kindName ], data);
    }

    query(sql: string, defaultLanguage?: DortdbLanguage): Result<QueryOutput> {
        try {
            const { data, schema } = this.innerDb.query<QueryOutputObject>(sql, defaultLanguage && { mainLang: defaultLanguage });

            let columns = schema ?? [ 'value' ];
            // Let's just say this string comparison is highly not ideal, but it's not our fault.
            if (columns.length === 1 && columns[0] === allAttrs.toString()) {
                // Expand * to all columns in the first row.
                columns = data.length > 0 ? Object.keys(data[0]) : [];
            }

            const rows: QueryOutputObject[] = schema
                ? data
                : data.map(value => ({ value }));

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

    explain(sql: string, defaultLanguage?: DortdbLanguage): Result<PlanNode> {
        try {
            const options = defaultLanguage && { mainLang: defaultLanguage };
            const parsed = this.innerDb.parse(sql, options);
            const plan = this.innerDb.buildPlan(parsed.at(-1)!, options);

            return successResult(queryPlanToTree(plan));
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
