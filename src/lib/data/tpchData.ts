import { type SqlValue } from '@/types/common';
import { type InputDataFile, type InputZipFile } from '../dataloaders/schema';
import { ColumnType } from '@/types/data';

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

const innerFiles: Record<string, InputDataFile> = {
    'customer.tbl': {
        type: 'csv',
        key: 'customer',
        columns: [
            // FIXME Data types are not guarranteed to be correct - some check is needed.
            { name: 'custkey', type: ColumnType.int },
            { name: 'name', type: ColumnType.string },
            { name: 'address', type: ColumnType.string },
            { name: 'nationkey', type: ColumnType.int },
            { name: 'phone', type: ColumnType.string },
            { name: 'acctbal', type: ColumnType.real },
            { name: 'mktsegment', type: ColumnType.string },
            { name: 'comment', type: ColumnType.string },
        ],
        csvOptions: {
            separator: '|',
            // FIXME actually don't know ...
            hasHeader: false,
        },
    },
    'lineitem.tbl': {
        type: 'csv',
        key: 'lineitem',
        columns: [
            { name: 'orderkey', type: ColumnType.int },
            { name: 'partkey', type: ColumnType.int },
            { name: 'suppkey', type: ColumnType.int },
            { name: 'linenumber', type: ColumnType.int },
            { name: 'quantity', type: ColumnType.real },
            { name: 'extendedprice', type: ColumnType.real },
            { name: 'discount', type: ColumnType.real },
            { name: 'tax', type: ColumnType.real },
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
    },
    'nation.tbl': {
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
    },
    'orders.tbl': {
        type: 'csv',
        key: 'orders',
        columns: [
            { name: 'orderkey', type: ColumnType.int },
            { name: 'custkey', type: ColumnType.int },
            { name: 'orderstatus', type: ColumnType.string },
            { name: 'totalprice', type: ColumnType.real },
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
    },
    'part.tbl': {
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
            { name: 'retailprice', type: ColumnType.real },
            { name: 'comment', type: ColumnType.string },
        ],
        csvOptions: {
            separator: '|',
            hasHeader: false,
        },
    },
    'partsupp.tbl': {
        type: 'csv',
        key: 'partsupp',
        columns: [
            { name: 'partkey', type: ColumnType.int },
            { name: 'suppkey', type: ColumnType.int },
            { name: 'availqty', type: ColumnType.int },
            { name: 'supplycost', type: ColumnType.real },
            { name: 'comment', type: ColumnType.string },
        ],
        csvOptions: {
            separator: '|',
            hasHeader: false,
        },
    },
    'region.tbl': {
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
    },
    'supplier.tbl': {
        type: 'csv',
        key: 'supplier',
        columns: [
            { name: 'suppkey', type: ColumnType.int },
            { name: 'name', type: ColumnType.string },
            { name: 'address', type: ColumnType.string },
            { name: 'nationkey', type: ColumnType.int },
            { name: 'phone', type: ColumnType.string },
            { name: 'acctbal', type: ColumnType.real },
            { name: 'comment', type: ColumnType.string },
        ],
        csvOptions: {
            separator: '|',
            hasHeader: false,
        },
    },
};

export const tpchFile: InputZipFile = {
    type: 'zip',
    files: innerFiles,
};
