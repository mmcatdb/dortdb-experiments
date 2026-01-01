export type DatasourceSchema = {
    // TODO
    file: FileSchema;
    kinds: KindSchema[];
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

export type ColumnDef = {
    name: string;
    type: ColumnType;
    graphType?: 'from' | 'to';
};

export enum ColumnType {
    string = 'string',
    int = 'int',
    float = 'float',
    date = 'date',
}

export type ParsedFileData = Record<string, ParsedSimpleFileData>;
export type ParsedSimpleFileData = Document | CsvRow[] | string[][];

// #endregion
// #region Kinds

export type KindSchema = TableSchema | GraphSchema | DocumentSchema;

export type TableSchema = {
    type: 'table';
    key: string;
    // TODO Not needed for now
    // columns: string[];
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
};

// #endregion
