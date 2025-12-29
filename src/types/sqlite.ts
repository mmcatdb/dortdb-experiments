import { ColumnType } from './data';

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
    case ColumnType.real:
        return SqliteColumnType.real;
    case ColumnType.date:
        return SqliteColumnType.text;
    }
}
