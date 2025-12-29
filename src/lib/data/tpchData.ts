import { type ExtractedFileOptions } from '@/lib/dataloaders/zip/zip-extractor';
import { type SqlValue } from '@/types/common';

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

export const tpchFiles: Record<string, ExtractedFileOptions> = {
    'customer.tbl': {
        type: 'csv',
        key: 'customer',
        columns: [
            'custkey',
            'name',
            'address',
            'nationkey',
            'phone',
            'acctbal',
            'mktsegment',
            'comment',
        ],
        csvOptions: {
            separator: '|',
            cast: {
                custkey: Number,
                nationkey: Number,
                acctbal: Number,
            },
        },
    },
    'lineitem.tbl': {
        type: 'csv',
        key: 'lineitem',
        columns: [
            'orderkey',
            'partkey',
            'suppkey',
            'linenumber',
            'quantity',
            'extendedprice',
            'discount',
            'tax',
            'returnflag',
            'linestatus',
            'shipdate',
            'commitdate',
            'receiptdate',
            'shipinstruct',
            'shipmode',
            'comment',
        ],
        csvOptions: {
            separator: '|',
            cast: {
                orderkey: Number,
                partkey: Number,
                suppkey: Number,
                linenumber: Number,
                quantity: Number,
                extendedprice: Number,
                discount: Number,
                tax: Number,
                shipdate: d => new Date(d),
                commitdate: d => new Date(d),
                receiptdate: d => new Date(d),
            },
        },
    },
    'nation.tbl': {
        type: 'csv',
        key: 'nation',
        columns: [ 'nationkey', 'name', 'regionkey', 'comment' ],
        csvOptions: {
            separator: '|',
            cast: {
                nationkey: Number,
                regionkey: Number,
            },
        },
    },
    'orders.tbl': {
        type: 'csv',
        key: 'orders',
        columns: [
            'orderkey',
            'custkey',
            'orderstatus',
            'totalprice',
            'orderdate',
            'orderpriority',
            'clerk',
            'shippriority',
            'comment',
        ],
        csvOptions: {
            separator: '|',
            cast: {
                orderkey: Number,
                custkey: Number,
                totalprice: Number,
                orderdate: d => new Date(d),
                shippriority: Number,
            },
        },
    },
    'part.tbl': {
        type: 'csv',
        key: 'part',
        columns: [
            'partkey',
            'name',
            'mfgr',
            'brand',
            'type',
            'size',
            'container',
            'retailprice',
            'comment',
        ],
        csvOptions: {
            separator: '|',
            cast: {
                partkey: Number,
                size: Number,
                retailprice: Number,
            },
        },
    },
    'partsupp.tbl': {
        type: 'csv',
        key: 'partsupp',
        columns: [ 'partkey', 'suppkey', 'availqty', 'supplycost', 'comment' ],
        csvOptions: {
            separator: '|',
            cast: {
                partkey: Number,
                suppkey: Number,
                availqty: Number,
                supplycost: Number,
            },
        },
    },
    'region.tbl': {
        type: 'csv',
        key: 'region',
        columns: [ 'regionkey', 'name', 'comment' ],
        csvOptions: {
            separator: '|',
            cast: {
                regionkey: Number,
            },
        },
    },
    'supplier.tbl': {
        type: 'csv',
        key: 'supplier',
        columns: [
            'suppkey',
            'name',
            'address',
            'nationkey',
            'phone',
            'acctbal',
            'comment',
        ],
        csvOptions: {
            separator: '|',
            cast: {
                suppkey: Number,
                nationkey: Number,
                acctbal: Number,
            },
        },
    },
};
