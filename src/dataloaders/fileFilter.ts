import { plural } from '@/components/utils';
import { topologicalSort } from '@/data/utils';
import { type ColumnDef, type CsvRow, type SimpleFileSchema, type DatasourceSchema, type ParsedFileData, ColumnType } from '@/types/schema';

export function filterFile(parsed: ParsedFileData, schema: DatasourceSchema): ParsedFileData {
    const output: ParsedFileData = {};

    const unorderedFiles = schema.file.type === 'zip' ? schema.file.files : [ schema.file ];
    // The files should be sorted in a way that dependencies are loaded first - so filtering some values from one shouldn't break things in another.
    const files = topologicalSort(unorderedFiles, file => {
        const dependencies = file.type === 'csv'
            ? file.columns.filter(col => col.references).map(col => col.references!.key)
            : [];
        return { key: file.key, dependencies };
    });

    for (const file of files) {
        const current = parsed[file.key];
        switch (file.type) {
        case 'csv':
            output[file.key] = filterCsv(current as CsvRow[], output, file);
            break;
        default:
            output[file.key] = current;
            break;
        }
    }

    return output;
}

function filterCsv(input: CsvRow[], allData: ParsedFileData, { key, columns, csvOptions }: Extract<SimpleFileSchema, { type: 'csv' }>): CsvRow[] {
    let output = input;

    if (csvOptions.filterRows)
        output = filterRows(output, columns, csvOptions.filterRows, csvOptions.idSeparator);
    if (csvOptions.doFilterDuplicates)
        output = filterDuplicates(output, columns, csvOptions.idSeparator);
    if (csvOptions.doFilterReferences)
        output = filterReferences(output, allData, columns);

    if (input.length !== output.length) {
        const diff = input.length - output.length;
        console.log(`Filtered ${diff} ${plural(diff, 'row')} from "${key}"`);
    }

    return output;
}

function filterRows(input: CsvRow[], columns: ColumnDef[], rows: CsvRow[], idSeparator: string | undefined): CsvRow[] {
    const idAccessor = createIdAccessor(columns, idSeparator);
    const filterSet = new Set<string>();
    for (const row of rows)
        filterSet.add(idAccessor(row));

    return input.filter(row => !filterSet.has(idAccessor(row)));
}

function filterDuplicates(input: CsvRow[], columns: ColumnDef[], idSeparator: string | undefined): CsvRow[] {
    const idAccessor = createIdAccessor(columns, idSeparator);
    const visitedSet = new Set<string>();

    return input.filter(row => {
        const id = idAccessor(row);
        if (!visitedSet.has(id)) {
            visitedSet.add(id);
            return true;
        }
        return false;
    });
}

function filterReferences(input: CsvRow[], allData: ParsedFileData, columns: ColumnDef[]) {
    const referencedColumns = columns.filter(col => col.references);

    for (const column of referencedColumns) {
        const reference = column.references!;
        const referencedData = allData[reference.key];
        if (!referencedData)
        // This also blocks circular references.
            throw new Error(`Referenced data "${reference.key}" not found for filtering.`);
        if (column.type === ColumnType.date)
            throw new Error('Date type is not supported for reference filtering.');

        // Let's hope there are no nulls ...
        const referencedSet = new Set<string | number>();
        for (const row of referencedData as CsvRow[])
            referencedSet.add(row[reference.column] as string | number);

        input = input.filter(row => referencedSet.has(row[column.name] as string | number));
    }
    return input;
}

function createIdAccessor(columns: ColumnDef[], idSeparator: string | undefined): (row: CsvRow) => string {
    const primaryKeyColumns = columns.filter(col => col.isPrimaryKey);
    if (primaryKeyColumns.length === 0)
        throw new Error('Id accessor requires at least one primary key column.');

    // Let's don't care about casting. You have made the mistake to use duplicated data, now you have to live with it.
    if (primaryKeyColumns.length === 1)
        return (row: CsvRow) => String(row[primaryKeyColumns[0].name]);

    if (idSeparator === undefined)
        throw new Error('Composite primary keys require a separator to create unique IDs.');

    return (row: CsvRow) => primaryKeyColumns.map(col => String(row[col.name])).join(idSeparator);
}
