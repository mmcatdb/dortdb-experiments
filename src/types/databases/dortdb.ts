import { type Result, successResult, type Database, type SqlTuple, errorResult, type ExampleQuery, type DortdbLanguage } from '../database';
import { datetime, DortDB, MapIndex } from '@dortdb/core';
import { defaultRules } from '@dortdb/core/optimizer';
import { SQL } from '@dortdb/lang-sql';
import { ConnectionIndex, Cypher } from '@dortdb/lang-cypher';
import { XQuery } from '@dortdb/lang-xquery';
import { type DatasourceData, type DatasourceSchema } from '../schema';

export class Dortdb implements Database {
    readonly type = 'DortDB';
    private readonly innerDb: DortDB;

    constructor() {
        this.innerDb = new DortDB({
            mainLang: SQL(),
            additionalLangs: [
                Cypher({ defaultGraph: 'defaultGraph' }),
                XQuery(),
            ],
            optimizer: {
                rules: defaultRules,
            },
            extensions: [ datetime ],
        });
    }

    async setData(schema: DatasourceSchema, data: DatasourceData, onProgress?: (progress: number) => Promise<void>): Promise<void> {
        const tables = [ ...schema.common, ...schema.multimodelOnly ];

        for (const table of tables) {
            const tableData = data.multimodel[table.key];
            if (!tableData)
                throw new Error(`No data found for table "${table.key}".`);

            this.innerDb.registerSource([ table.key ], tableData);
        }

        await onProgress?.(1 / 2);

        // FIXME This is specific for unibench data, make this more generic later.
        this.innerDb.createIndex([ 'defaultGraph', 'nodes' ], [], ConnectionIndex);
        this.innerDb.createIndex([ 'defaultGraph', 'nodes' ], [ 'x.id' ], MapIndex, {
            fromItemKey: [ 'x' ],
            mainLang: 'cypher',
        });
        this.innerDb.createIndex([ 'defaultGraph', 'edges' ], [], ConnectionIndex);
        this.innerDb.createIndex([ 'customers' ], [ 'id' ], MapIndex);
        this.innerDb.createIndex([ 'products' ], [ 'productId' ], MapIndex);
        this.innerDb.createIndex([ 'products' ], [ 'brand' ], MapIndex);
        this.innerDb.createIndex([ 'products' ], [ 'asin' ], MapIndex);
        this.innerDb.createIndex([ 'feedback' ], [ 'productAsin' ], MapIndex);
        this.innerDb.createIndex([ 'brandProducts' ], [ 'brandName' ], MapIndex);
        this.innerDb.createIndex([ 'brandProducts' ], [ 'productAsin' ], MapIndex);
        this.innerDb.createIndex([ 'vendors' ], [ 'id' ], MapIndex);
        this.innerDb.createIndex([ 'posts' ], [ 'id' ], MapIndex);
        this.innerDb.createIndex([ 'orders' ], [ 'PersonId::number' ], MapIndex);
    }

    setRawData(tableName: string, data: unknown): void {
        this.innerDb.registerSource([ tableName ], data);
    }

    query(sql: string, defaultLanguage?: DortdbLanguage): Result<SqlTuple[]> {
        try {
            return successResult(this.innerDb.query<SqlTuple>(sql, defaultLanguage && { mainLang: defaultLanguage }).data);
        }
        catch (error) {
            return errorResult(error);
        }
    }

    getDefaultQuery(): string {
        return defaultQuery;
    }

    getExamples(): ExampleQuery[] {
        return examples;
    }
}

const defaultQuery = `
-- Retrieve all records from the customers table
SELECT * FROM customers
LIMIT 2
`.trim();

const examples: ExampleQuery[] = [ {
    name: 'Query 1',
    defaultLanguage: 'sql',
    query: `
-- all data about CUSTOMER
--
-- one such customer id is 4145

SELECT
    ROW(customers.id AS id, customers.firstName AS firstName, customers.lastName AS lastName) profile,
    ARRAY(SELECT ROW(orders.OrderId as orderId, orders.Orderline AS orderline, orders.TotalPrice AS totalPrice) FROM orders WHERE PersonId = customers.id) orders,
    ARRAY(SELECT ROW(feedback.productAsin AS asin, feedback.feedback AS feedback) FROM feedback WHERE personId = customers.id) feedback,
    ARRAY(
        LANG cypher
        MATCH ({id: customers.id})<-[:hasCreator]-(post)
        RETURN post
    ) posts
FROM customers
WHERE id = 4145
    `,
}, {
    name: 'Query 2',
    defaultLanguage: 'sql',
    query: `
-- customers which bought PRODUCT and posted about it
--
-- one such product id is 52

SELECT id, firstName
FROM customers
WHERE EXISTS (
    LANG cypher
    MATCH (:person {id: customers.id})<-[:hasCreator]-(post)-[:hasTag]->({id: 52})
    RETURN 1
)
AND EXISTS (
    SELECT 1 FROM orders
    WHERE PersonId = customers.id AND EXISTS (
        SELECT 1 FROM unwind(orders.Orderline) orderline WHERE productId = 52
    )
)
    `,
}, {
    name: 'Query 3',
    defaultLanguage: 'sql',
    query: `
-- customers which posted about PRODUCT and left negative feedback
--
-- the only such product in the dataset is 202

SELECT customers.id, feedback.feedback, products.productId
FROM customers
JOIN feedback ON customers.id = feedback.personId
JOIN products ON feedback.productAsin = products.asin
WHERE products.productId = 202 AND (feedback.feedback[1])::number < 3
AND EXISTS (
    LANG cypher
    MATCH ({id: customers.id})<-[:hasCreator]-(post)-[:hasTag]->({id: products.productId})
    RETURN 1
)
    `,
}, {
    name: 'Query 4',
    defaultLanguage: 'cypher',
    query: `
// three-hop common friends of the two top spenders
//
// these two are actually not connected in the sample data

UNWIND (
    LANG sql
    SELECT PersonId::number
    FROM orders
    GROUP BY PersonId
    ORDER BY sum(TotalPrice) DESC
    LIMIT 2
) AS toptwo
WITH collect(toptwo) AS toptwo
MATCH (:person {id: toptwo[0]})-[:knows *..3]->(foaf)<-[:knows *..3]-({id: toptwo[1]})
RETURN foaf
    `,
}, {
    name: 'Query 5',
    defaultLanguage: 'cypher',
    query: `
// what did the friends of CUSTOMER which bought BRAND products post about?
//
// example customer id: 4659
// example brand: Reebok

MATCH (:person {id: 4659})-[:knows]->(person)<-[:hasCreator]-()-[:hasTag]->(tag)
WHERE EXISTS {
    LANG xquery
    $invoices/Invoices/Invoice.xml[PersonId=$person/@id]/Orderline[brand="Reebok"]
}
RETURN DISTINCT tag.id
    `,
}, {
    name: 'Query 6',
    defaultLanguage: 'sql',
    query: `
-- find persons in the shortest path between CUSTOMERS and return their top 3 bestsellers
--
-- example customer ids: 4145, 4882

SELECT x.value AS productId
FROM (
    LANG xquery
    for $interPerson in (
        LANG cypher
        MATCH (:person {id: 4145})-[edges:knows*]-({id: 4882})
        WITH [e in edges[1..-1] | [startNode(e), endNode(e)]] AS edges LIMIT 1 // recursion is BFS, so this is shortest path
        UNWIND edges AS edge
        UNWIND edge AS person
        RETURN DISTINCT person.id
    ), $productId in $invoices/Invoices/Invoice.xml[PersonId=$interPerson]//productId
    group by $num := number($productId)
    order by fn:count($productId) descending
    return $num
) x
LIMIT 3
    `,
}, {
    name: 'Query 7',
    defaultLanguage: 'sql',
    query: `
-- find negative feedback on BRAND products with decreasing sales
--
-- example brand name: Reebok

SELECT feedback.feedback
FROM feedback
JOIN brandProducts ON brandProducts.productAsin = feedback.productAsin
WHERE brandProducts.brandName = 'Reebok' AND feedback.feedback[1]::number < 4 AND (
    LANG xquery
    let $now := date('2024-12-31') (: the data is static :)
    let $recent := $invoices/Invoices/Invoice.xml[
        date(OrderDate) gt date:sub($now, interval('6 months'))
    ][Orderline/asin = $brandProducts.productAsin]
    let $old := $invoices/Invoices/Invoice.xml[
        date(OrderDate) le date:sub($now, interval('6 months')) and
        date(OrderDate) gt date:sub($now, interval('12 months'))
    ][Orderline/asin = $brandProducts.productAsin]
    return fn:count($recent) lt fn:count($old)
)
    `,
}, {
    name: 'Query 8',
    defaultLanguage: 'sql',
    query: `
-- compute this year's total sales amount and social media popularity of
-- products in CATEGORY
--
-- the only category in the dataset is Sports

SELECT
    x.value->'id' AS productId,
    x.value->'sales' AS sales,
    x.value->'popularity' || '%' AS popularity
FROM (
    LANG xquery
    let $categoryProducts := (
        LANG sql
        SELECT products.productId
        FROM products
        JOIN brandProducts ON products.asin = brandProducts.productAsin
        JOIN vendors ON brandProducts.brandName = vendors.id
        WHERE vendors.Industry = 'Sports'
    ),
    $yrAgo := date:sub(date('2024-12-31'), interval('1y')),
    $postsYrAgo := date('2011-12-31') (: there are no posts newer than 2012 in the dataset :)
    let $totalPosts := (
        LANG cypher
        UNWIND categoryProducts AS pid
        MATCH ({id: pid})<-[:hasTag]-(p)
        WHERE p.creationDate > postsYrAgo
        RETURN count(p)
    )

    for $pid in $categoryProducts
    let $soldProducts := $invoices/Invoices/Invoice.xml[
        date(OrderDate) gt $yrAgo
    ]/Orderline[productId eq $pid],
    $relatedPosts := (
        LANG cypher
        MATCH ({id: pid})<-[:hasTag]-(p)
        WHERE p.creationDate > postsYrAgo
        RETURN count(p)
    )
    return <product
        id="{ $pid }"
        sales="{ sum($soldProducts/price/number()) }"
        popularity="{ $relatedPosts div $totalPosts * 100 }"
    />
) x
     `,
}, {
    name: 'Query 9',
    defaultLanguage: 'sql',
    query: `
-- compare male and female customer ratio of top 3 vendors in COUNTRY and find latest posts about them
--
-- an example country is China

SELECT
    topVendors.id,
    (
        SELECT count(*) FILTER (WHERE gender = 'male') / count(*) FILTER (WHERE gender = 'female')
        FROM customers
        WHERE EXISTS (
            SELECT 1 FROM orders WHERE PersonId = customers.id
            AND Orderline @> ARRAY[ROW(topVendors.id AS brand)]
        )
    ) mfRatio,
    ARRAY(
        LANG cypher
        UNWIND (
            LANG sql
            SELECT products.productId
            FROM products
            JOIN brandProducts ON products.asin = brandProducts.productAsin
            WHERE brandProducts.brandName = topVendors.id
        ) AS productId
        MATCH ({id: productId})<-[:hasTag]-(post)
        RETURN post.content
        ORDER BY post.creationDate DESC LIMIT 5
    ) latestPosts
FROM (
    SELECT
        vendors.id,
        (
            LANG xquery
            let $sales := $invoices/Invoices/Invoice.xml/Orderline[brand = $vendors:id]
            return fn:count($sales)
        ) sales
    FROM vendors
    WHERE Country = 'China'
    ORDER BY sales DESC
    LIMIT 3
) topVendors
    `,
}, {
    name: 'Query 10',
    defaultLanguage: 'sql',
    query: `
-- find this year's top posters and get their recency/frequency/monetary statistics,
-- their interests and their latest feedback

SELECT
    orders.PersonId,
    topPosters.interests,
    MAX(orders.OrderDate) recency,
    COUNT(orders.PersonId) frequency,
    SUM(orders.TotalPrice) monetary,
    ARRAY(
        SELECT feedback FROM feedback
        WHERE personId = orders.PersonId
        LIMIT 10
    ) recentReviews
FROM orders JOIN (
    LANG cypher
    MATCH (cust)<-[:hasCreator]-(post)
    WHERE post.creationDate > date.sub(date('2011-12-31'), interval('1 year'))
    WITH DISTINCT cust, count(post) AS postCount
    ORDER BY postCount DESC LIMIT 10
    MATCH (cust)-[:hasInterest]->(tag)
    RETURN cust.id AS custId, collect(tag.id) AS interests
) topPosters
ON orders.PersonId = topPosters.custId
GROUP BY orders.PersonId, topPosters.interests
    `,
} ].map(example => ({
    name: example.name,
    query: example.query.trim(),
    defaultLanguage: example.defaultLanguage as DortdbLanguage,
}));
