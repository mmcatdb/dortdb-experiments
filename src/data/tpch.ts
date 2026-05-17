import { ColumnType, type CsvParseOptions, type DatasourceSchema, type SimpleFileSchema } from '@/types/schema';
import { copyTableDef } from './utils';

const csvOptions: CsvParseOptions = {
    separator: '|',
    hasHeader: false,
};

const files: SimpleFileSchema[] = [ {
    path: 'customer.tbl',
    type: 'csv',
    key: 'customer',
    columns: [
        { name: 'custkey', type: ColumnType.int, isPrimaryKey: true },
        { name: 'name', type: ColumnType.string },
        { name: 'address', type: ColumnType.string },
        { name: 'nationkey', type: ColumnType.int, references: { key: 'nation', column: 'nationkey' } },
        { name: 'phone', type: ColumnType.string },
        { name: 'acctbal', type: ColumnType.float },
        { name: 'mktsegment', type: ColumnType.string },
        { name: 'comment', type: ColumnType.string },
    ],
    csvOptions,
}, {
    path: 'lineitem.tbl',
    type: 'csv',
    key: 'lineitem',
    columns: [
        { name: 'orderkey', type: ColumnType.int, isPrimaryKey: true, references: { key: 'orders', column: 'orderkey' } },
        { name: 'partkey', type: ColumnType.int, references: { key: 'part', column: 'partkey' } },
        { name: 'suppkey', type: ColumnType.int, references: { key: 'supplier', column: 'suppkey' } },
        { name: 'linenumber', type: ColumnType.int, isPrimaryKey: true },
        { name: 'quantity', type: ColumnType.float },
        { name: 'extendedprice', type: ColumnType.float },
        { name: 'discount', type: ColumnType.float },
        { name: 'tax', type: ColumnType.float },
        { name: 'returnflag', type: ColumnType.string },
        { name: 'linestatus', type: ColumnType.string },
        { name: 'shipdate', type: ColumnType.date },
        { name: 'commitdate', type: ColumnType.date },
        { name: 'receiptdate', type: ColumnType.date },
        { name: 'shipinstruct', type: ColumnType.string },
        { name: 'shipmode', type: ColumnType.string },
        { name: 'comment', type: ColumnType.string },
    ],
    csvOptions,
}, {
    path: 'nation.tbl',
    type: 'csv',
    key: 'nation',
    columns: [
        { name: 'nationkey', type: ColumnType.int, isPrimaryKey: true },
        { name: 'name', type: ColumnType.string },
        { name: 'regionkey', type: ColumnType.int, references: { key: 'region', column: 'regionkey' } },
        { name: 'comment', type: ColumnType.string },
    ],
    csvOptions,
}, {
    path: 'orders.tbl',
    type: 'csv',
    key: 'orders',
    columns: [
        { name: 'orderkey', type: ColumnType.int, isPrimaryKey: true },
        { name: 'custkey', type: ColumnType.int, references: { key: 'customer', column: 'custkey' } },
        { name: 'orderstatus', type: ColumnType.string },
        { name: 'totalprice', type: ColumnType.float },
        { name: 'orderdate', type: ColumnType.date },
        { name: 'orderpriority', type: ColumnType.string },
        { name: 'clerk', type: ColumnType.string },
        { name: 'shippriority', type: ColumnType.int },
        { name: 'comment', type: ColumnType.string },
    ],
    csvOptions,
}, {
    path: 'part.tbl',
    type: 'csv',
    key: 'part',
    columns: [
        { name: 'partkey', type: ColumnType.int, isPrimaryKey: true },
        { name: 'name', type: ColumnType.string },
        { name: 'mfgr', type: ColumnType.string },
        { name: 'brand', type: ColumnType.string },
        { name: 'type', type: ColumnType.string },
        { name: 'size', type: ColumnType.int },
        { name: 'container', type: ColumnType.string },
        { name: 'retailprice', type: ColumnType.float },
        { name: 'comment', type: ColumnType.string },
    ],
    csvOptions,
}, {
    path: 'partsupp.tbl',
    type: 'csv',
    key: 'partsupp',
    columns: [
        { name: 'partkey', type: ColumnType.int, isPrimaryKey: true, references: { key: 'part', column: 'partkey' } },
        { name: 'suppkey', type: ColumnType.int, isPrimaryKey: true, references: { key: 'supplier', column: 'suppkey' } },
        { name: 'availqty', type: ColumnType.int },
        { name: 'supplycost', type: ColumnType.float },
        { name: 'comment', type: ColumnType.string },
    ],
    csvOptions,
}, {
    path: 'region.tbl',
    type: 'csv',
    key: 'region',
    columns: [
        { name: 'regionkey', type: ColumnType.int, isPrimaryKey: true },
        { name: 'name', type: ColumnType.string },
        { name: 'comment', type: ColumnType.string },
    ],
    csvOptions,
}, {
    path: 'supplier.tbl',
    type: 'csv',
    key: 'supplier',
    columns: [
        { name: 'suppkey', type: ColumnType.int, isPrimaryKey: true },
        { name: 'name', type: ColumnType.string },
        { name: 'address', type: ColumnType.string },
        { name: 'nationkey', type: ColumnType.int, references: { key: 'nation', column: 'nationkey' } },
        { name: 'phone', type: ColumnType.string },
        { name: 'acctbal', type: ColumnType.float },
        { name: 'comment', type: ColumnType.string },
    ],
    csvOptions,
} ];

export const tpch: DatasourceSchema = {
    label: 'TPC-H',
    type: 'tpch',
    file: {
        path: 'https://data.mmcatdb.com/tpch.zip',
        type: 'zip',
        files,
    },
    common: [
        copyTableDef(files, 'customer'),
        copyTableDef(files, 'lineitem'),
        copyTableDef(files, 'nation'),
        copyTableDef(files, 'orders'),
        copyTableDef(files, 'part'),
        copyTableDef(files, 'partsupp'),
        copyTableDef(files, 'region'),
        copyTableDef(files, 'supplier'),
    ],
    relationalOnly: [
        // tpch is only relational for now
    ],
    multimodelOnly: [
        // tpch is only relational for now
    ],
};
