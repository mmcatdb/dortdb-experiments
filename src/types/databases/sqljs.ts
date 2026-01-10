import { type Result, rowsToObjects, successResult, type Database, errorResult, csvRowToSql, type ExampleQuery, type PlanNode, type QueryOutput } from '../database';
import initSqlJs from 'sql.js';
import { type TableSchema, type DatasourceData, type DatasourceSchema } from '../schema';
import { createPreparedInsertStatement, createSqliteSchema, type ExplainSqlObject, queryPlanToTree } from '../sqlite';

const SQL = await initSqlJs({
    // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want.
    // You can omit locateFile completely when running in node.
    // locateFile: file => `https://sql.js.org/dist/${file}`,
    // Files in the public directory are served at the root path - so we can use just the filename instead of public/filename
    locateFile: file => file,
});

export class Sqljs implements Database {
    readonly type = 'sql.js';
    private readonly innerDb: initSqlJs.Database;

    constructor() {
        this.innerDb = new SQL.Database();
    }

    async setData(schema: DatasourceSchema, data: DatasourceData, onProgress?: (progress: number) => Promise<void>): Promise<void> {
        const { tables, statements } = createSqliteSchema(schema);
        const sqlScript = statements.join('\n');
        this.innerDb.run(sqlScript);

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
        const statement = this.innerDb.prepare(createPreparedInsertStatement(table));

        for (const row of tableData)
            statement.run(csvRowToSql(row, table.columns));

        statement.free();
    }

    query(sql: string): Result<QueryOutput> {
        try {
            const result = this.innerDb.exec(sql);
            // A list of results is returned (one for each statement executed). However, for some un-fucking-believable reason, if there are no rows, the result is skipped.
            // Unbelievable.
            if (result.length === 0)
                return successResult({ columns: [], rows: [] });

            const { columns, values } = result[0];
            const rows = rowsToObjects(columns, values);

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
        return sqlQueryExamples;
    }

    explain(sql: string): Result<PlanNode> {
        try {
            const planSql = `EXPLAIN QUERY PLAN ${sql}`;
            const result = this.innerDb.exec(planSql);
            if (result.length === 0)
                return errorResult('No EXPLAIN output.');

            const { columns, values } = result[0];
            const plan = queryPlanToTree(rowsToObjects(columns, values) as ExplainSqlObject[]);
            return successResult(plan);
        }
        catch (error) {
            return errorResult(error);
        }
    }
}

const defaultQuery = `
-- Retrieve all records from the customers table
SELECT * FROM customers
LIMIT 2
`.trim();

export const sqlQueryExamples: ExampleQuery[] = [ {
    name: 'Query 1',
    query: `
-- Query 1.
-- For a given customer, find his/her all related data including profile, orders, invoices, feedback, comments, and posts in the last month, return the category in which he/she has bought the largest number of products, and return the tag of the customer posts which he/she has engaged with the greatest times.
--
-- one such customer id is 4145
-- FIXME the query is still not according to the description

SELECT
    json_object(
        'id', customers.id,
        'firstName', customers.firstName,
        'lastName', customers.lastName
    ) AS profile,
    customer_orders.content AS orders,
    customer_feedback.content AS feedback,
    customer_posts.content AS posts
FROM customers

JOIN (
    SELECT
        orders.PersonId AS customer_id,
        json_group_array(json_object(
            'orderId', orders.OrderId,
            'totalPrice', orders.totalPrice,
            'orderlines', json(order_orderlines.orderlines)
        )) AS content
        FROM orders
        LEFT JOIN (
            SELECT
                Orderline.OrderId AS order_id,
                json_group_array(json_object(
                    'productId', Orderline.productId,
                    'asin', Orderline.asin,
                    'title', Orderline.title,
                    'price', Orderline.price,
                    'brand', Orderline.brand
                )) AS orderlines
            FROM Orderline
            JOIN orders ON orders.OrderId = Orderline.OrderId
            GROUP BY Orderline.OrderId
        ) AS order_orderlines ON order_orderlines.order_id = orders.OrderId
        GROUP BY orders.PersonId
) AS customer_orders ON customer_orders.customer_id = customers.id

JOIN (
    SELECT
        feedback.personId AS customer_id,
        json_group_array(json_object(
            'asin', feedback.productAsin,
            'feedback', feedback.feedback
        )) AS content
    FROM feedback
    GROUP BY feedback.personId
) AS customer_feedback ON customer_feedback.customer_id = customers.id

JOIN (
    SELECT
        hasCreator.PersonId AS customer_id,
        json_group_array(json_object(
            'id', posts.id,
            'imageFile', posts.imageFile,
            'creationDate', posts.creationDate,
            'locationIP', posts.locationIP,
            'browserUsed', posts.browserUsed,
            'language', posts.language,
            'content', posts.content,
            'length', posts.length
        )) AS content
    FROM hasCreator
    JOIN posts ON posts.id = hasCreator.PostId
    GROUP BY hasCreator.PersonId
) AS customer_posts ON customer_posts.customer_id = customers.id

WHERE customers.id = 4145
    `,

    // Variant with correlated subqueries is several times slower in sql.js:
    // SELECT
    //   ...,
    //   (SELECT json_group_array(...) FROM orders WHERE PersonId = c.id),
    //   (SELECT json_group_array(...) FROM feedback WHERE personId = c.id),
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
    name: 'Query 2 - in',
    query: `
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
    name: 'Query 2 - join',
    query: `
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
    name: 'Query 2 - exists',
    query: `
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
    name: 'Query 3',
    query: `
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
    name: 'Query 4',
    query: `
-- TODO
-- Includes graph paths with variable lengths so I think we can pass on this one.
    `,
}, {
    name: 'Query 5',
    query: `
-- what did the friends of CUSTOMER which bought BRAND products post about?
--
-- example customer id: 4659
-- example brand: Reebok

SELECT TagId
FROM hasTag
JOIN hasCreator ON hasCreator.PostId = hasTag.PostId
JOIN knows ON knows.\`to\` = hasCreator.PersonId
JOIN orders ON orders.PersonId = knows.\`to\`
JOIN Orderline ON Orderline.OrderId = orders.OrderId
WHERE knows.\`from\` = 4659
AND Orderline.brand = 'Reebok'
GROUP BY TagId
    `,
}, {
    name: 'Query 6',
    query: `
-- TODO
-- Again, path query, skip.
    `,
}, {
    name: 'Query 7',
    query: `
-- TODO
    `,
}, {
    name: 'Query 8',
    query: `
-- TODO
    `,
}, {
    name: 'Query 9',
    query: `
-- TODO
    `,
}, {
    name: 'Query 10',
    query: `
-- TODO
    `,
} ].map(example => ({
    name: example.name,
    query: example.query.trim(),
    defaultLanguage: 'sql',
}));
