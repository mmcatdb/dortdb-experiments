import { ColumnType, type CsvParseOptions, type DatasourceSchema, type SimpleFileSchema } from '@/types/schema';
import { copyTableDef } from './utils';

const csvOptions: CsvParseOptions = {
    separator: ',',
    hasHeader: true,
};

const files: SimpleFileSchema[] = [ {
    path: 'customer.csv',
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
    path: 'lineitem.csv',
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
    path: 'nation.csv',
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
    path: 'orders.csv',
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
    path: 'part.csv',
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
    path: 'partsupp.csv',
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
    path: 'region.csv',
    type: 'csv',
    key: 'region',
    columns: [
        { name: 'regionkey', type: ColumnType.int, isPrimaryKey: true },
        { name: 'name', type: ColumnType.string },
        { name: 'comment', type: ColumnType.string },
    ],
    csvOptions,
}, {
    path: 'supplier.csv',
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

const commonSchema: Omit<DatasourceSchema, 'label' | 'file'> = {
    type: 'tpch',
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

const commonPrefix = 'https://data.mmcatdb.com/tpch/';

export const tpch: DatasourceSchema[] = [
    'sample', '0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5',
].map(scale => ({
    ...commonSchema,
    label: `TPC-H ${scale}`,
    file: {
        path: `${commonPrefix}tpch-${scale}.zip`,
        type: 'zip',
        files,
    },
}));
