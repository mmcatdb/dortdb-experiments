import { ColumnType } from '@/types/schema';

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
