import { type ColumnDef } from '@/types/data';
import { type CsvParseOptions } from './parsers/csvParser';

export type InputFile = InputDataFile | InputZipFile;

export type InputZipFile = {
    type: 'zip';
    // No nested zip files for now.
    files: Record<string, InputDataFile>;
};

export type InputDataFile = {
    key: string;
} & ({
    type: 'csv';
    columns: ColumnDef[];
    csvOptions: CsvParseOptions;
} | {
    type: 'ndjson' | 'xml';
});

export type DatasourceSchema = {
    tables: Record<string, TableSchema>;
    graphs: Record<string, TableSchema>;
};

export type TableSchema = {
    columns: ColumnDef[];
};
