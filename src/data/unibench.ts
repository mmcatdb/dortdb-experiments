import { type SimpleFileSchema, type DatasourceSchema, ColumnType } from '@/types/schema';
import { copyTableDef } from './utils';

const files: SimpleFileSchema[] = [ {
    path: 'Dataset/Customer/person_0_0.csv',
    type: 'csv',
    key: 'customers',
    columns: [
        { name: 'id', type: ColumnType.int },
        { name: 'firstName', type: ColumnType.string },
        { name: 'lastName', type: ColumnType.string },
        { name: 'gender', type: ColumnType.string },
        { name: 'birthday', type: ColumnType.date },
        { name: 'creationDate', type: ColumnType.date },
        { name: 'locationIP', type: ColumnType.string },
        { name: 'browserUsed', type: ColumnType.string },
        { name: 'place', type: ColumnType.int },
    ],
    csvOptions: {
        separator: '|',
        hasHeader: true,
    },
}, {
    path: 'Dataset/Feedback/Feedback.csv',
    type: 'csv',
    key: 'feedback',
    columns: [
        { name: 'productAsin', type: ColumnType.string },
        { name: 'personId', type: ColumnType.int },
        { name: 'feedback', type: ColumnType.string },
    ],
    csvOptions: {
        separator: '|',
        hasHeader: false,
    },
}, {
    path: 'Dataset/Product/BrandByProduct.csv',
    type: 'csv',
    key: 'brandProducts',
    columns: [
        { name: 'brandName', type: ColumnType.string },
        { name: 'productAsin', type: ColumnType.string },
    ],
    csvOptions: {
        separator: ',',
        hasHeader: false,
    },
}, {
    path: 'Dataset/Product/Product.csv',
    type: 'csv',
    key: 'products',
    columns: [
        { name: 'asin', type: ColumnType.string },
        { name: 'title', type: ColumnType.string },
        { name: 'price', type: ColumnType.float },
        { name: 'imgUrl', type: ColumnType.string },
        { name: 'productId', type: ColumnType.int },
        { name: 'brand', type: ColumnType.int },
    ],
    csvOptions: {
        separator: ',',
        hasHeader: true,
    },
}, {
    path: 'Dataset/Vendor/Vendor.csv',
    type: 'csv',
    key: 'vendors',
    columns: [
        { name: 'id', type: ColumnType.string },
        { name: 'Country', type: ColumnType.string },
        { name: 'Industry', type: ColumnType.string },
    ],
    csvOptions: {
        separator: ',',
        hasHeader: true,
    },
}, {
    path: 'Dataset/SocialNetwork/post_0_0.csv',
    type: 'csv',
    key: 'posts',
    columns: [
        { name: 'id', type: ColumnType.int },
        { name: 'imageFile', type: ColumnType.string },
        { name: 'creationDate', type: ColumnType.date },
        { name: 'locationIP', type: ColumnType.string },
        { name: 'browserUsed', type: ColumnType.string },
        { name: 'language', type: ColumnType.string },
        { name: 'content', type: ColumnType.string },
        { name: 'length', type: ColumnType.string },
    ],
    csvOptions: {
        separator: '|',
        hasHeader: true,
    },
}, {
    path: 'Dataset/Invoice/Invoice.xml',
    type: 'xml',
    key: 'invoices',
}, {
    path: 'Dataset/Order/Order.json',
    type: 'ndjson',
    key: 'orders',
}, {
    path: 'Dataset/SocialNetwork/person_hasInterest_tag_0_0.csv',
    type: 'csv',
    key: 'hasInterest',
    columns: [
        { name: 'Person.id', type: ColumnType.int },
        { name: 'Tag.id', type: ColumnType.int },
    ],
    csvOptions: {
        separator: '|',
        hasHeader: true,
    },
}, {
    path: 'Dataset/SocialNetwork/person_knows_person_0_0.csv',
    type: 'csv',
    key: 'knows',
    columns: [
        { name: 'from', type: ColumnType.int },
        { name: 'to', type: ColumnType.int },
        { name: 'creationDate', type: ColumnType.date },
    ],
    csvOptions: {
        separator: '|',
        hasHeader: true,
    },
}, {
    path: 'Dataset/SocialNetwork/post_hasCreator_person_0_0.csv',
    type: 'csv',
    key: 'hasCreator',
    columns: [
        { name: 'PostId', type: ColumnType.int },
        { name: 'PersonId', type: ColumnType.int },
    ],
    csvOptions: {
        separator: '|',
        hasHeader: true,
    },
}, {
    path: 'Dataset/SocialNetwork/post_hasTag_tag_0_0.csv',
    type: 'csv',
    key: 'hasTag',
    columns: [
        { name: 'PostId', type: ColumnType.int },
        { name: 'TagId', type: ColumnType.int },
    ],
    csvOptions: {
        separator: '|',
        hasHeader: true,
    },
} ];

export const unibench: DatasourceSchema = {
    label: 'Unibench',
    file: {
        path: 'https://data.mmcatdb.com/unibench.zip',
        // path: 'https://data.mmcatdb.com/unibench-full.zip',
        type: 'zip',
        files,
    },
    common: [
        copyTableDef(files, 'customers'),
        copyTableDef(files, 'feedback'),
        copyTableDef(files, 'brandProducts'),
        copyTableDef(files, 'products'),
        copyTableDef(files, 'vendors'),
        copyTableDef(files, 'posts'),
    ],
    relationalOnly: [
        copyTableDef(files, 'hasInterest'),
        copyTableDef(files, 'knows'),
        copyTableDef(files, 'hasCreator'),
        copyTableDef(files, 'hasTag'),
        // TODO documents
    ],
    multimodelOnly: [ {
        type: 'document',
        key: 'invoices',
    }, {
        type: 'document',
        key: 'orders',
    }, {
        type: 'graph',
        key: 'defaultGraph',
        edges: [ {
            key: 'hasInterest',
            props: [],
            from: {
                idColumn: 'Person.id',
                label: 'person',
                source: { key: 'customers', column: 'id' },
            },
            to: {
                idColumn: 'Tag.id',
                label: 'tag',
            },
        }, {
            key: 'knows',
            props: [ 'creationDate' ],
            from: {
                idColumn: 'from',
                label: 'person',
                source: { key: 'customers', column: 'id' },
            },
            to: {
                idColumn: 'to',
                label: 'person',
                source: { key: 'customers', column: 'id' },
            },
        }, {
            key: 'hasCreator',
            props: [],
            from: {
                idColumn: 'PostId',
                label: 'post',
                source: { key: 'posts', column: 'id' },
            },
            to: {
                idColumn: 'PersonId',
                label: 'person',
                source: { key: 'customers', column: 'id' },
            },
        }, {
            key: 'hasTag',
            props: [],
            from: {
                idColumn: 'PostId',
                label: 'post',
                source: { key: 'posts', column: 'id'  },
            },
            to: {
                idColumn: 'TagId',
                label: 'tag',
            },
        } ],
    } ],
};
