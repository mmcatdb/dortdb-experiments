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
    /**
     * Well guess why is this needed. You think nobody would be stupid enough to create a csv file with duplicated primary keys? Think again.
     * Use this only when absolutely necessary, as it requires extra processing.
     * Also, we can't just delegate this to the database, because dortdb doesn't have normal inserts ...
     */
    doFilterDuplicates?: boolean;
    /**
     * This is just sad. And disgusting. But mostly sad.
     * These rows will be filtered out. Only primary key columns are needed.
    */
    doFilterReferences?: boolean;
    /**
    * Catch-all for everything we don't like.
    */
    filterRows?: CsvRow[];
    /**
     * Used for generating composite IDs by joining primary key columns with this separator (for one of the options above).
     * Make sure to provide a value that does not appear in the data.
     * Needed only if there are multiple primary key columns.
     */
    idSeparator?: string;
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
    references?: {
        key: string;
        column: string;
        /**
         * Because unibench data is even worse than we were able to imagine in our darkest nightmares.
         * And alasql is buggy af.
         * Use whenever the referenced column isn't a primary key but it behaves like one (i.e., is unique).
         */
        isDuplicatedKey?: boolean;
    };
    isUnique?: boolean;
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
    indexes?: string[];
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
