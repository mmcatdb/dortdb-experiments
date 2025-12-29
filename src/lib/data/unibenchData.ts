import { type SqlTuple } from '@/types/common';
import { ColumnType } from '@/types/data';
import { type GraphologyGraph } from '@dortdb/lang-cypher';
import { type InputFile, type InputDataFile } from '../dataloaders/schema';

export type UnibenchData = {
    customers: SqlTuple[];
    invoices: Document;
    orders: SqlTuple[];
    feedback: SqlTuple[];
    products: SqlTuple[];
    brandProducts: SqlTuple[];
    vendors: SqlTuple[];
    socialNetwork: GraphologyGraph;
    posts: SqlTuple[];
};

const innerFiles: Record<string, InputDataFile> = {
    'Dataset/Customer/person_0_0.csv': {
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
    },
    'Dataset/Feedback/Feedback.csv': {
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
    },
    'Dataset/Product/BrandByProduct.csv': {
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
    },
    'Dataset/Product/Product.csv': {
        type: 'csv',
        key: 'products',
        columns: [
            { name: 'asin', type: ColumnType.string },
            { name: 'title', type: ColumnType.string },
            { name: 'price', type: ColumnType.real },
            { name: 'imgUrl', type: ColumnType.string },
            { name: 'productId', type: ColumnType.int },
            { name: 'brand', type: ColumnType.int },
        ],
        csvOptions: {
            separator: ',',
            hasHeader: true,
        },
    },
    'Dataset/Vendor/Vendor.csv': {
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
    },
    'Dataset/SocialNetwork/post_0_0.csv': {
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
    },
    // FIXME
    // 'Dataset/Invoice/Invoice.xml': {
    //     type: 'xml',
    //     key: 'invoices',
    // },
    // 'Dataset/Order/Order.json': {
    //     type: 'ndjson',
    //     key: 'orders',
    // },
    'Dataset/SocialNetwork/person_hasInterest_tag_0_0.csv': {
        type: 'csv',
        key: 'hasInterest',
        columns: [
            { name: 'Person.id', type: ColumnType.int, graphType: 'from' },
            { name: 'Tag.id', type: ColumnType.int, graphType: 'to' },
        ],
        csvOptions: {
            separator: '|',
            hasHeader: true,
        },
    },
    'Dataset/SocialNetwork/person_knows_person_0_0.csv': {
        type: 'csv',
        key: 'knows',
        columns: [
            { name: 'from', type: ColumnType.int, graphType: 'from' },
            { name: 'to', type: ColumnType.int, graphType: 'to' },
            { name: 'creationDate', type: ColumnType.date },
        ],
        csvOptions: {
            separator: '|',
            hasHeader: true,
        },
    },
    'Dataset/SocialNetwork/post_hasCreator_person_0_0.csv': {
        type: 'csv',
        key: 'hasCreator',
        columns: [
            { name: 'PostId', type: ColumnType.int, graphType: 'from' },
            { name: 'PersonId', type: ColumnType.int, graphType: 'to' },
        ],
        csvOptions: {
            separator: '|',
            hasHeader: true,
        },
    },
    'Dataset/SocialNetwork/post_hasTag_tag_0_0.csv': {
        type: 'csv',
        key: 'hasTag',
        columns: [
            { name: 'PostId', type: ColumnType.int, graphType: 'from' },
            { name: 'TagId', type: ColumnType.int, graphType: 'to' },
        ],
        csvOptions: {
            separator: '|',
            hasHeader: true,
        },
    },
};

export const unibenchFile: InputFile = {
    type: 'zip',
    files: innerFiles,
};

const graphFiles = {
    'Dataset/SocialNetwork/person_hasInterest_tag_0_0.csv': {
        key: 'hasInterest',
        fromKey: 'customers',
        toKey: '',
    },
    'Dataset/SocialNetwork/person_knows_person_0_0.csv': {
        key: 'knows',
        fromKey: 'customers',
        toKey: 'customers',
    },
    'Dataset/SocialNetwork/post_hasCreator_person_0_0.csv': {
        key: 'hasCreator',
        fromKey: 'posts',
        toKey: 'customers',
    },
    'Dataset/SocialNetwork/post_hasTag_tag_0_0.csv': {
        key: 'hasTag',
        fromKey: 'posts',
        toKey: '',
    },
};
