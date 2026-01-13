import { type Result, successResult, type Database, type SqlObject, errorResult, csvRowToSql, type ExampleQuery, type QueryOutput } from '../database';
import alasqlRaw from 'alasql';
import { type DatasourceData, type DatasourceSchema, type TableSchema } from '../schema';
import { createPreparedInsertStatement, createSqliteSchema } from '../sqlite';

// This is ugly but alasql uses commonjs modules and interface augmentation doesn't work.
type AlaSQL = typeof alasqlRaw & {
    compile<T = unknown>(sql: string): (...params: any[]) => T;
};

const alasql = alasqlRaw as AlaSQL;

export class Alasql implements Database {
    readonly type = 'AlaSQL';
    static nextId = 0;
    private readonly innerDbId: string;

    constructor() {
        this.innerDbId = 'db-' + Alasql.nextId++;
        // Kinda not ideal but the inner typings of alasql are beyond insanity.
        new alasql.Database(this.innerDbId);
    }

    async setData(schema: DatasourceSchema, data: DatasourceData, onProgress?: (progress: number) => Promise<void>): Promise<void> {
        alasql.use(this.innerDbId);

        const { tables, statements } = createSqliteSchema(schema, 'alasql');
        const sqlScript = statements.join('\n');
        alasql(sqlScript);

        const steps = tables.length + 1;
        let step = 1;

        for (const table of tables) {
            await onProgress?.(step++ / steps);
            this.insertTableData(table, data);
        }
    }

    private insertTableData(table: TableSchema, data: DatasourceData): void {
        const tableData = data.relational[table.key];
        if (!tableData)
            throw new Error(`No data found for table "${table.key}".`);

        console.log(`[${this.type}] Inserting data into "${table.key}"`, tableData.length);
        const insert = alasql.compile(createPreparedInsertStatement(table));

        for (const row of tableData)
            insert(csvRowToSql(row, table.columns));
    }

    query(sql: string): Result<QueryOutput> {
        try {
            alasql.use(this.innerDbId);
            const rows = alasql<SqlObject[]>(sql);
            const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

            return successResult({ columns, rows });
        }
        catch (error) {
            return errorResult(error);
        }
    }

    getDefaultQuery(): string {
        return defaultQuery;
    }

    getExamples(): ExampleQuery[] {
        // Not sure whether this is correct, sqljs has a little different escaping.
        return queryExamples;
    }
}

const defaultQuery = `
-- Retrieve all records from the customers table
SELECT * FROM customers
LIMIT 2
`.trim();

export const queryExamples: ExampleQuery[] = [ {
    name: 'Query 1',
    query: `
-- Query 1
-- For a given customer, find his/her all related data including profile, orders, invoices, feedback, comments, and posts in the last month, return the category in which he/she has bought the largest number of products, and return the tag of the customer posts which he/she has engaged with the greatest times.
-- We don't filter by time here since the data is static.
-- We also don't find the most used category/tag since we already return all.
-- Lastly, invoices are just duplicated orders so we skip them as well.
--
-- one such customer id is 4145

SELECT
    {
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName
    } AS profile,
    customer_orders.content AS orders,
    customer_feedback.content AS feedback,
    customer_posts.content AS posts

FROM customers

JOIN (
    SELECT
        orders.PersonId AS customer_id,
        ARRAY({
            orderId: orders.OrderId,
            orderline: order_orderlines.content,
            totalPrice: orders.totalPrice
        }) AS content
    FROM orders
    LEFT JOIN (
        SELECT
            Orderline.OrderId AS order_id,
            ARRAY({
                productId: Orderline.productId,
                asin: Orderline.asin,
                title: Orderline.title,
                price: Orderline.price,
                brand: Orderline.brand
            }) AS content
        FROM Orderline
        JOIN orders ON orders.OrderId = Orderline.OrderId
        GROUP BY Orderline.OrderId
    ) AS order_orderlines ON order_orderlines.order_id = orders.OrderId
    GROUP BY orders.PersonId
) AS customer_orders ON customer_orders.customer_id = customers.id

JOIN (
    SELECT
        feedback.personId AS customer_id,
        ARRAY({
            asin: feedback.productAsin,
            feedback: feedback.feedback
        }) AS content
    FROM feedback
    GROUP BY feedback.personId
) AS customer_feedback ON customer_feedback.customer_id = customers.id

JOIN (
    SELECT
        hasCreator.PersonId AS customer_id,
        ARRAY({
            id: posts.id,
            imageFile: posts.imageFile,
            creationDate: posts.creationDate,
            locationIP: posts.locationIP,
            browserUsed: posts.browserUsed,
            language: posts.language,
            content: posts.content,
            length: posts.length
        }) AS content
    FROM hasCreator
    JOIN posts ON posts.id = hasCreator.PostId
    GROUP BY hasCreator.PersonId
) AS customer_posts ON customer_posts.customer_id = customers.id

WHERE customers.id = 4145;
    `,

    // Variant with correlated subqueries is several times slower in sql.js:
    // SELECT
    //   ...,
    //   (SELECT ARRAY(...) FROM orders WHERE PersonId = c.id),
    //   (SELECT ARRAY(...) FROM feedback WHERE personId = c.id),
    //   ...
    // FROM customers c
    // WHERE c.id = 4145;


    // TODO a possible alternative if we only care about getting the data, not the aggregation:
    // SELECT *
    // FROM customers
    // WHERE customers.id = 4145;

    // SELECT *
    // FROM orders
    // WHERE orders.PersonId = 4145;

    // SELECT Orderline.*
    // FROM Orderline
    // JOIN orders ON orders.OrderId = Orderline.OrderId
    // WHERE orders.PersonId = 4145;

    // SELECT *
    // FROM feedback
    // WHERE feedback.personId = 4145;

    // SELECT posts.*
    // FROM posts
    // JOIN hasCreator ON hasCreator.PostId = posts.id
    // WHERE hasCreator.PersonId = 4145;

}, {
    name: 'Query 2 - JOIN',
    query: `
-- Query 2 - JOIN
-- customers which bought PRODUCT and posted about it
-- using JOIN and GROUP BY, kinda slow in sql.js
--
-- one such product id is 52

SELECT customers.id, customers.firstName
FROM customers
JOIN hasCreator ON hasCreator.PersonId = customers.id
JOIN posts ON posts.id = hasCreator.PostId
JOIN hasTag ON hasTag.PostId = posts.id
JOIN orders ON orders.PersonId = customers.id
JOIN Orderline ON orders.OrderId = Orderline.OrderId
WHERE hasTag.TagId = 52
AND Orderline.productId = 52
GROUP BY customers.id
    `,
}, {
    name: 'Query 2 - IN (slow)',
    query: `
-- Query 2 - IN (slow)
-- customers which bought PRODUCT and posted about it
-- using IN, the fastest in sql.js
--
-- one such product id is 52

SELECT customers.id, customers.firstName
FROM customers
WHERE customers.id IN (
    SELECT hasCreator.PersonId
    FROM hasTag
    JOIN posts ON posts.id = hasTag.PostId
    JOIN hasCreator ON hasCreator.PostId = posts.id
    WHERE hasTag.TagId = 52
)
AND customers.id IN (
    SELECT orders.PersonId
    FROM orders
    JOIN Orderline ON orders.OrderId = Orderline.OrderId
    WHERE Orderline.productId = 52
)
    `,
}, {
    name: 'Query 2 - EXISTS (slow)',
    query: `
-- Query 2 - EXISTS (slow)
-- customers which bought PRODUCT and posted about it
-- using EXISTS, extremely slow in sql.js
--
-- one such product id is 52

SELECT customers.id, customers.firstName
FROM customers
WHERE EXISTS (
    SELECT 1
    FROM hasCreator
    JOIN posts ON posts.id = hasCreator.PostId
    JOIN hasTag ON hasTag.PostId = posts.id
    WHERE hasCreator.PersonId = customers.id
    AND hasTag.TagId = 52
)
AND EXISTS (
    SELECT 1
    FROM orders
    JOIN Orderline ON orders.OrderId = Orderline.OrderId
    WHERE orders.PersonId = customers.id
    AND Orderline.productId = 52
)
    `,
}, {
    name: 'Query 3 - JOIN',
    query: `
-- Query 3 - JOIN
-- customers which posted about PRODUCT and left negative feedback
--
-- the only such product in the dataset is 202

SELECT DISTINCT customers.id, feedback.feedback, products.productId
FROM customers
JOIN feedback ON customers.id = feedback.personId
JOIN products ON feedback.productAsin = products.asin
JOIN (
    SELECT DISTINCT hasCreator.PersonId, hasTag.TagId AS productId
    FROM hasTag
    JOIN posts ON posts.id = hasTag.PostId
    JOIN hasCreator ON hasCreator.PostId = posts.id
) AS tagged_posts ON tagged_posts.PersonId = customers.id
    AND tagged_posts.productId = products.productId
WHERE products.productId = 202
AND CAST(SUBSTR(feedback.feedback, 2, INSTR(feedback.feedback, ',') - 2) AS REAL) < 3
    `,
}, {
    name: 'Query 3 - IN',
    query: `
-- Query 3 - IN
-- customers which posted about PRODUCT and left negative feedback
--
-- the only such product in the dataset is 202

SELECT customers.id, feedback.feedback, products.productId
FROM customers
JOIN feedback ON customers.id = feedback.personId
JOIN products ON feedback.productAsin = products.asin
WHERE products.productId = 202
AND CAST(SUBSTR(feedback.feedback, 2, INSTR(feedback.feedback, ',') - 2) AS REAL) < 3
AND customers.id IN (
    SELECT hasCreator.PersonId
    FROM hasTag
    JOIN posts ON posts.id = hasTag.PostId
    JOIN hasCreator ON hasCreator.PostId = posts.id
    WHERE hasTag.TagId = products.productId
)
    `,
}, {
    name: 'Query 3 - EXISTS',
    query: `
-- Query 3 - EXISTS
-- customers which posted about PRODUCT and left negative feedback
--
-- the only such product in the dataset is 202

SELECT customers.id, feedback.feedback, products.productId
FROM customers
JOIN feedback ON customers.id = feedback.personId
JOIN products ON feedback.productAsin = products.asin
WHERE products.productId = 202
AND CAST(SUBSTR(feedback.feedback, 2, INSTR(feedback.feedback, ',') - 2) AS REAL) < 3
AND EXISTS (
    SELECT 1
    FROM hasTag
    JOIN posts ON posts.id = hasTag.PostId
    JOIN hasCreator ON hasCreator.PostId = posts.id
    WHERE hasCreator.PersonId = customers.id
    AND hasTag.TagId = products.productId
)
    `,
}, {
    name: 'Query 4',
    query: `
-- Query 4
-- three-hop common friends of the two top spenders
--
-- these two are actually not connected in the sample data

WITH
top_two AS (
    SELECT PersonId
    FROM orders
    GROUP BY PersonId
    ORDER BY SUM(TotalPrice) DESC
    LIMIT 2
),

p1 AS (
    SELECT PersonId AS id
    FROM top_two
    LIMIT 1 OFFSET 0
),

p2 AS (
    SELECT PersonId AS id
    FROM top_two
    LIMIT 1 OFFSET 1
),

-- people reachable FROM p1 within 3 hops
RECURSIVE rf(id, depth) AS (
    SELECT p1.id, 0
    FROM p1
    UNION ALL
    SELECT knows.[to], rf.depth + 1
    FROM rf
    JOIN knows ON knows.[from] = rf.id
    WHERE rf.depth < 3
),

reachable_from_p1 AS (
    SELECT DISTINCT id
    FROM rf
    WHERE depth > 0
),

-- people that can reach p2 within 3 hops
RECURSIVE rt(id, depth) AS (
    SELECT p2.id, 0
    FROM p2
    UNION ALL
    SELECT knows.[from], rt.depth + 1
    FROM rt
    JOIN knows ON knows.[to] = rt.id
    WHERE rt.depth < 3
),

reachable_to_p2 AS (
    SELECT DISTINCT id
    FROM rt
    WHERE depth > 0
)

-- intersection (foaf)
SELECT DISTINCT customers.id
FROM customers
JOIN reachable_from_p1 ON reachable_from_p1.id = customers.id
JOIN reachable_to_p2   ON reachable_to_p2.id = customers.id;
    `,
}, {
    name: 'Query 5',
    query: `
-- what did the friends of CUSTOMER which bought BRAND products post about?
--
-- example customer id: 6192
-- example brand: Reebok

SELECT TagId
FROM hasTag
JOIN hasCreator ON hasCreator.PostId = hasTag.PostId
JOIN knows ON knows.[to] = hasCreator.PersonId
JOIN orders ON orders.PersonId = knows.[to]
JOIN Orderline ON Orderline.OrderId = orders.OrderId
WHERE knows.[from] = 6192
AND Orderline.brand = 'Reebok'
GROUP BY TagId
    `,
} ].map(example => ({
    name: example.name,
    query: example.query.trim(),
    defaultLanguage: 'sql',
}));
