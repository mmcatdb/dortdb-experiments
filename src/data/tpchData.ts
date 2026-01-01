import { type SqlValue } from '@/types/database';
import { ColumnType, type DatasourceSchema, type SimpleFileSchema } from '@/types/schema';

export type TpchData = {
    customer: SqlValue[];
    lineitem: SqlValue[];
    nation: SqlValue[];
    orders: SqlValue[];
    part: SqlValue[];
    partsupp: SqlValue[];
    region: SqlValue[];
    supplier: SqlValue[];
};

const innerFiles: SimpleFileSchema[] = [ {
    path: 'customer.tbl',
    type: 'csv',
    key: 'customer',
    columns: [
        // FIXME Data types are not guarranteed to be correct - some check is needed.
        { name: 'custkey', type: ColumnType.int },
        { name: 'name', type: ColumnType.string },
        { name: 'address', type: ColumnType.string },
        { name: 'nationkey', type: ColumnType.int },
        { name: 'phone', type: ColumnType.string },
        { name: 'acctbal', type: ColumnType.float },
        { name: 'mktsegment', type: ColumnType.string },
        { name: 'comment', type: ColumnType.string },
    ],
    csvOptions: {
        separator: '|',
        // FIXME actually don't know ...
        hasHeader: false,
    },
}, {
    path: 'lineitem.tbl',
    type: 'csv',
    key: 'lineitem',
    columns: [
        { name: 'orderkey', type: ColumnType.int },
        { name: 'partkey', type: ColumnType.int },
        { name: 'suppkey', type: ColumnType.int },
        { name: 'linenumber', type: ColumnType.int },
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
    csvOptions: {
        separator: '|',
        hasHeader: false,
    },
}, {
    path: 'nation.tbl',
    type: 'csv',
    key: 'nation',
    columns: [
        { name: 'nationkey', type: ColumnType.int },
        { name: 'name', type: ColumnType.string },
        { name: 'regionkey', type: ColumnType.int },
        { name: 'comment', type: ColumnType.string },
    ],
    csvOptions: {
        separator: '|',
        hasHeader: false,
    },
}, {
    path: 'orders.tbl',
    type: 'csv',
    key: 'orders',
    columns: [
        { name: 'orderkey', type: ColumnType.int },
        { name: 'custkey', type: ColumnType.int },
        { name: 'orderstatus', type: ColumnType.string },
        { name: 'totalprice', type: ColumnType.float },
        { name: 'orderdate', type: ColumnType.date },
        { name: 'orderpriority', type: ColumnType.string },
        { name: 'clerk', type: ColumnType.string },
        { name: 'shippriority', type: ColumnType.int },
        { name: 'comment', type: ColumnType.string },
    ],
    csvOptions: {
        separator: '|',
        hasHeader: false,
    },
}, {
    path: 'part.tbl',
    type: 'csv',
    key: 'part',
    columns: [
        { name: 'partkey', type: ColumnType.int },
        { name: 'name', type: ColumnType.string },
        { name: 'mfgr', type: ColumnType.string },
        { name: 'brand', type: ColumnType.string },
        { name: 'type', type: ColumnType.string },
        { name: 'size', type: ColumnType.int },
        { name: 'container', type: ColumnType.string },
        { name: 'retailprice', type: ColumnType.float },
        { name: 'comment', type: ColumnType.string },
    ],
    csvOptions: {
        separator: '|',
        hasHeader: false,
    },
}, {
    path: 'partsupp.tbl',
    type: 'csv',
    key: 'partsupp',
    columns: [
        { name: 'partkey', type: ColumnType.int },
        { name: 'suppkey', type: ColumnType.int },
        { name: 'availqty', type: ColumnType.int },
        { name: 'supplycost', type: ColumnType.float },
        { name: 'comment', type: ColumnType.string },
    ],
    csvOptions: {
        separator: '|',
        hasHeader: false,
    },
}, {
    path: 'region.tbl',
    type: 'csv',
    key: 'region',
    columns: [
        { name: 'regionkey', type: ColumnType.int },
        { name: 'name', type: ColumnType.string },
        { name: 'comment', type: ColumnType.string },
    ],
    csvOptions: {
        separator: '|',
        hasHeader: false,
    },
}, {
    path: 'supplier.tbl',
    type: 'csv',
    key: 'supplier',
    columns: [
        { name: 'suppkey', type: ColumnType.int },
        { name: 'name', type: ColumnType.string },
        { name: 'address', type: ColumnType.string },
        { name: 'nationkey', type: ColumnType.int },
        { name: 'phone', type: ColumnType.string },
        { name: 'acctbal', type: ColumnType.float },
        { name: 'comment', type: ColumnType.string },
    ],
    csvOptions: {
        separator: '|',
        hasHeader: false,
    },
} ];

export const tpchSchema: DatasourceSchema = {
    file: {
        // TODO The file doesn't exist yet ...
        path: 'https://data.mmcatdb.com/tpch.zip',
        type: 'zip',
        files: innerFiles,
    },
    kinds: [
        // TODO
    ],
};
