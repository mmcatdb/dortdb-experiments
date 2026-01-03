import { type MultiDirectedGraph } from 'graphology';

export type DatasourceSchema = {
    label: string;
    file: FileSchema;
    /** Kinds that should be used in both relational and multimodel databases. */
    common: TableSchema[];
    relationalOnly: RelationalKindSchema[];
    multimodelOnly: MultimodelKindSchema[];
};

export type DatasourceData = {
    /** All parsed data. */
    parsed: ParsedFileData;
    /** Common tables + data converted to tables. */
    relational: Record<string, CsvRow[]>;
    /** Common tables + data converted to graphs/documents. */
    multimodel: Record<string, KindData>;
};

// #region Files

export type FileSchema = SimpleFileSchema | ZipFileSchema;

export type ZipFileSchema = {
    path: string;
    type: 'zip';
    // No nested zip files for now.
    files: SimpleFileSchema[];
};

export type SimpleFileSchema = {
    path: string;
    key: string;
} & ({
    type: 'csv';
    columns: ColumnDef[];
    csvOptions: CsvParseOptions;
} | {
    type: 'ndjson' | 'xml';
});

export type CsvParseOptions = {
    separator: string;
    hasHeader: boolean;
};

export type CsvRow = Record<string, CsvValue>;
export type CsvValue = string | number | Date | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type JsonPrimitive = string | number | boolean | null;

export type ColumnDef = {
    name: string;
    type: ColumnType;
    isPrimaryKey?: boolean;

    // TODO
    // references?: {
    //     table: string;
    //     column: string;
    // };

    // TODO
    // indexes: {
    //     name: string;
    //     columns: string[];
    //     unique: boolean;
    // }[];
};

export enum ColumnType {
    string = 'string',
    int = 'int',
    float = 'float',
    date = 'date',
}

export type ParsedFileData = Record<string, ParsedSimpleFileData>;
export type ParsedSimpleFileData = CsvRow[] | Document | JsonObject[];

// #endregion
// #region Kinds

export type RelationalKindSchema = TableSchema | DocumentTablesSchema;
export type MultimodelKindSchema = TableSchema | GraphSchema | DocumentSchema;

export type TableSchema = {
    type: 'table';
    key: string;
    columns: ColumnDef[];
};

export type GraphSchema = {
    type: 'graph';
    key: string;
    edges: EdgeSchema[];
};

export type EdgeSchema = {
    key: string;
    props: string[];
    from: NodeSchema;
    to: NodeSchema;
};

type NodeSchema = {
    idColumn: string;
    label: string;
    source?: NodeSource;
};

type NodeSource = {
    key: string;
    column: string;
};

export type DocumentSchema = {
    type: 'document';
    key: string;
    table?: DocumentTable;
};

export type DocumentTablesSchema = {
    type: 'documentTables';
    from: 'json' | 'xml';
    key: string;
    root: DocumentTable;
};

export type DocumentTable = {
    name: string;
    columns: ColumnDef[];
    /** If defined, these columns will be injected from the parent. Type is not needed because it ahs to be the same. The key refers to the key in the parent row, i.e., the parent column's `name` */
    fromParent?: ColumnDef[];
    children?: DocumentTableChild[];
};

type DocumentTableChild = DocumentTable & {
    key: string;
};

export type KindData = ParsedSimpleFileData | MultiDirectedGraph;

// #endregion
