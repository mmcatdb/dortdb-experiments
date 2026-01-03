import { type CsvRow, type DocumentTablesSchema, type JsonObject, type DocumentTable, type JsonValue, type CsvValue, ColumnType } from '@/types/schema';

export function convertJsonToCsv(input: JsonObject[], schema: DocumentTablesSchema): Record<string, CsvRow[]> {
    const output: Record<string, CsvRow[]> = {};

    for (const object of input)
        processJsonObject(object, undefined, output, schema.root);

    return output;
}

function processJsonObject(input: JsonObject, parent: CsvRow | undefined, output: Record<string, CsvRow[]>, schema: DocumentTable) {
    const { name, columns, fromParent, children } = schema;

    const row: CsvRow = {};

    // Extract columns from the current object
    for (const column of columns)
        row[column.name] = jsonValueToCsvValue(input[column.name], column.type);

    // Extract columns from the parent object if defined
    if (fromParent) {
        for (const column of fromParent)
            row[column.name] = parent![column.name];
    }

    let outputArray = output[name];
    if (!outputArray) {
        outputArray = [];
        output[name] = outputArray;
    }

    output[name].push(row);

    if (children) {
        for (const child of children) {
            const childInput = input[child.key];
            if (Array.isArray(childInput)) {
                for (const childObject of childInput)
                    processJsonObject(childObject as JsonObject, row, output, child);
            }
            else {
                processJsonObject(childInput as JsonObject, row, output, child);
            }
        }
    }
}

function jsonValueToCsvValue(json: JsonValue, type: ColumnType): CsvValue {
    if (json === undefined || json === null)
        return null;

    switch (type) {
    case ColumnType.int:
    case ColumnType.float:
        return Number(json);
    case ColumnType.date:
        return new Date(json as string | number);
    case ColumnType.string:
        return String(json);
    }
}
