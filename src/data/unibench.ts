import { type SimpleFileSchema, type DatasourceSchema, ColumnType, type DocumentTablesSchema } from '@/types/schema';
import { copyTableDef } from './utils';

const files: SimpleFileSchema[] = [ {
    path: 'Dataset/Customer/person_0_0.csv',
    type: 'csv',
    key: 'customers',
    columns: [
        { name: 'id', type: ColumnType.int, isPrimaryKey: true },
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
        { name: 'productAsin', type: ColumnType.string, isPrimaryKey: true, references: { key: 'products', column: 'asin' } },
        { name: 'personId', type: ColumnType.int, isPrimaryKey: true, references: { key: 'customers', column: 'id' } },
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
        { name: 'brandName', type: ColumnType.string, references: { key: 'vendors', column: 'id' } },
        { name: 'productAsin', type: ColumnType.string, isPrimaryKey: true, references: { key: 'products', column: 'asin' } },
    ],
    csvOptions: {
        separator: ',',
        hasHeader: false,
        doFilterReferences: true,
    },
}, {
    path: 'Dataset/Product/Product.csv',
    type: 'csv',
    key: 'products',
    columns: [
        { name: 'asin', type: ColumnType.string, isPrimaryKey: true },
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
        { name: 'id', type: ColumnType.string, isPrimaryKey: true },
        { name: 'Country', type: ColumnType.string },
        { name: 'Industry', type: ColumnType.string },
    ],
    csvOptions: {
        separator: ',',
        hasHeader: true,
        doFilterDuplicates: true, // Shame. Shame. Shame.
    },
}, {
    path: 'Dataset/SocialNetwork/post_0_0.csv',
    type: 'csv',
    key: 'posts',
    columns: [
        { name: 'id', type: ColumnType.int, isPrimaryKey: true },
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
        { name: 'Person.id', type: ColumnType.int, isPrimaryKey: true, references: { key: 'customers', column: 'id' } },
        { name: 'Tag.id', type: ColumnType.int, isPrimaryKey: true }, // Doesn't reference anything as the tags table doesn't exist.
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
        { name: 'from', type: ColumnType.int, isPrimaryKey: true, references: { key: 'customers', column: 'id' } },
        { name: 'to', type: ColumnType.int, isPrimaryKey: true, references: { key: 'customers', column: 'id' } },
        { name: 'creationDate', type: ColumnType.date },
    ],
    csvOptions: {
        separator: '|',
        hasHeader: true,
        doFilterReferences: true,
    },
}, {
    path: 'Dataset/SocialNetwork/post_hasCreator_person_0_0.csv',
    type: 'csv',
    key: 'hasCreator',
    columns: [
        { name: 'PostId', type: ColumnType.int, isPrimaryKey: true, references: { key: 'posts', column: 'id' } },
        { name: 'PersonId', type: ColumnType.int, isPrimaryKey: true, references: { key: 'customers', column: 'id' } },
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
        { name: 'PostId', type: ColumnType.int, isPrimaryKey: true, references: { key: 'posts', column: 'id' } },
        { name: 'TagId', type: ColumnType.int, isPrimaryKey: true }, // Doesn't reference anything as the tags table doesn't exist.
    ],
    csvOptions: {
        separator: '|',
        hasHeader: true,
    },
} ];

const ordersDocumentTables: DocumentTablesSchema = {
    type: 'documentTables',
    from: 'json',
    key: 'orders',
    root: {
        name: 'orders',
        columns: [
            { name: 'OrderId', type: ColumnType.string, isPrimaryKey: true },
            { name: 'PersonId', type: ColumnType.int, references: { key: 'customers', column: 'id' } },
            { name: 'OrderDate', type: ColumnType.date },
            { name: 'TotalPrice', type: ColumnType.float },
        ],
        children: [ {
            key: 'Orderline',
            name: 'Orderline',
            columns: [
                { name: 'productId', type: ColumnType.int, references: { key: 'products', column: 'productId', isDuplicatedKey: true } },
                { name: 'asin', type: ColumnType.string, isPrimaryKey: true, references: { key: 'products', column: 'asin' } },
                { name: 'title', type: ColumnType.string },
                { name: 'price', type: ColumnType.float },
                { name: 'brand', type: ColumnType.string },
            ],
            fromParent: [
                { name: 'OrderId', type: ColumnType.string, isPrimaryKey: true, references: { key: 'orders', column: 'OrderId' } },
            ],
        } ],
    },
};

export const unibenchSample: DatasourceSchema = {
    label: 'Unibench Sample',
    file: {
        path: 'https://data.mmcatdb.com/Unibench-0.2.sample.zip',
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
        ordersDocumentTables,
        // No need to include invoices as they are a literal copy of orders.
        // We still have them in the multimodel schema though to show we support both json and xml.
    ],
    multimodelOnly: [ {
        type: 'document',
        key: 'invoices',
        // TODO Why no index here?
    }, {
        type: 'document',
        key: 'orders',
        indexes: [ 'PersonId::number' ],
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

export const unibenchFull: DatasourceSchema = {
    ...unibenchSample,
    label: 'Unibench Full',
    file: {
        ...unibenchSample.file,
        path: 'https://data.mmcatdb.com/Unibench-0.2.zip',
    },
};
