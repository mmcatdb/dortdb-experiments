import { extractTablesFromDocument, topologicalSort } from '@/data/utils';
import { type ColumnDef, ColumnType, type DatasourceSchema, type TableSchema } from '@/types/schema';
import { type PlanNode } from './database';

/** Called *Type Affinity* in the docs. All other "types" are cast to one of these. */
export enum SqliteColumnType {
    text = 'text',
    numeric = 'numeric',
    integer = 'integer',
    real = 'real',
    blob = 'blob',
}

export function columnTypeToSqlite(type: ColumnType): SqliteColumnType {
    switch (type) {
    case ColumnType.string:
        return SqliteColumnType.text;
    case ColumnType.int:
        return SqliteColumnType.integer;
    case ColumnType.float:
        return SqliteColumnType.real;
    case ColumnType.date:
        return SqliteColumnType.text;
    }
}

export function createSqliteSchema(schema: DatasourceSchema): { tables: TableSchema[], statements: string[] } {
    const statements: string[] = [];

    const unsortedTables = [ ...schema.common, ...schema.relationalOnly ].flatMap(
        kind => kind.type === 'table' ? [ kind ] : extractTablesFromDocument(kind.root),
    );

    const tables = sortTablesByDependencies(unsortedTables);

    for (const table of tables.toReversed())
        statements.push(`DROP TABLE IF EXISTS ${escape(table.key)};`);

    for (const table of tables) {
        statements.push(defineTable(table));
        statements.push(...defineTableIndexes(table));
    }

    return { tables, statements };
}

function sortTablesByDependencies(tables: TableSchema[]): TableSchema[] {
    return topologicalSort(tables, table => ({
        key: table.key,
        dependencies: table.columns.filter(col => col.references).map(col => col.references!.key),
    }));
}

function defineTable(table: TableSchema): string {
    const tableCommands: string[] = [];
    const columnDefs = table.columns.map(col => defineColumn(col));
    tableCommands.push(...columnDefs);

    const primaryKeys = table.columns.filter(col => col.isPrimaryKey).map(col => escape(col.name));
    if (primaryKeys.length === 0)
        throw new Error(`Table "${table.key}" must have at least one primary key column.`);

    tableCommands.push(`PRIMARY KEY (${primaryKeys.join(', ')})`);

    return `CREATE TABLE ${escape(table.key)} (\n${tableCommands.join(',\n')}\n);`;
}

function defineColumn(column: ColumnDef): string {
    let colDef = `${escape(column.name)} ${columnTypeToSqlite(column.type)}`;
    if (column.references)
        colDef += ` REFERENCES ${escape(column.references.key)}(${escape(column.references.column)})`;

    return colDef;
}

function defineTableIndexes(table: TableSchema): string[] {
    const output: string[] = [];

    // According to the sqlite documentation, indexes on primary keys are created automatically.
    // Indexes on foreign keys are not but should be created manually.
    // https://www.sqlite.org/foreignkeys.html#fk_indexes:~:text=So%2C%20in%20most%20real%20systems%2C%20an%20index%20should%20be%20created%20on%20the%20child%20key%20columns%20of%20each%20foreign%20key%20constraint.
    const indexedColumns = table.columns.filter(col => !col.isPrimaryKey && col.references);
    for (const column of indexedColumns)
        output.push(defineIndex(table, column));

    return output;
}

function defineIndex(table: TableSchema, column: ColumnDef): string {
    const indexName = `${table.key}_${column.name}_index`;
    return `CREATE INDEX ${escape(indexName)} ON ${escape(table.key)}(${escape(column.name)});`;
}

function escape(key: string): string {
    return '`' + key + '`';
}

export function createPreparedInsertStatement(table: TableSchema): string {
    const columnDefs = table.columns.map(() => '?').join(', ');
    return `INSERT INTO ${escape(table.key)} VALUES (${columnDefs});`;
}

export type ExplainSqlTuple = {
    id: number;
    parent: number;
    notused: number;
    detail: string;
};

export function queryPlanToTree(rows: ExplainSqlTuple[]): PlanNode {
    const root: PlanNode = {
        label: 'QUERY PLAN',
        children: [],
    };

    const nodes: Map<number, PlanNode> = new Map();
    nodes.set(0, root);

    for (const row of rows) {
        const node: PlanNode = {
            label: row.detail,
            children: [],
        };
        nodes.set(row.id, node);

        const parentNode = nodes.get(row.parent);
        if (!parentNode)
            throw new Error(`Parent node with id ${row.parent} not found.`);

        parentNode.children.push(node);
    }

    return root;
}
