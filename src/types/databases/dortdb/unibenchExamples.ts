import type { DortdbLanguage, ExampleQuery } from '@/types/database';

export const unibenchExamples: ExampleQuery[] = [ {
    name: 'Custom 1',
    defaultLanguage: 'sql',
    query: `
-- Custom Query 1

SELECT
  feedback.productAsin AS product,
  COUNT(*) AS feedbackCnt,
--SUM((feedback.feedback[1])::number * friends.weight) AS feedbackSum,
--SUM(friends.weight) AS weightSum,
  SUM((feedback.feedback[1])::number * friends.weight) / SUM(friends.weight) AS feedbackAvg,
  SUM((((feedback.feedback[1])::number) - 3) * friends.weight) AS feedbackTotal
FROM
  ( LANG cypher
    MATCH (friend)<-[path:knows*]-(:person {id: 32985348843745})
    RETURN
      friend.id as friendId,
      path.length as distance,
      0.5^(path.length-1) as weight ) friends,
  feedback
WHERE feedback.personId=friends.friendId
GROUP BY feedback.productAsin
ORDER BY SUM((((feedback.feedback[1])::number) - 3) * friends.weight) DESC
;
    `,
}, {
    name: 'Query 1',
    defaultLanguage: 'sql',
    query: `
-- Query 1
-- For a given customer, find his/her all related data including profile, orders, invoices, feedback, comments, and posts in the last month, return the category in which he/she has bought the largest number of products, and return the tag of the customer posts which he/she has engaged with the greatest times.
-- We don't filter by time here since the data is static.
-- We also don't find the most used category/tag since we already return all.
-- Lastly, invoices are just duplicated orders so we skip them as well.
--
-- one such customer id is 4145

SELECT
    ROW(customers.id AS id, customers.firstName AS firstName, customers.lastName AS lastName) profile,
    ARRAY(SELECT ROW(orders.OrderId as orderId, orders.Orderline AS orderline, orders.TotalPrice AS totalPrice) FROM orders WHERE PersonId = customers.id) orders,
    ARRAY(SELECT ROW(feedback.productAsin AS asin, feedback.feedback AS feedback) FROM feedback WHERE personId = customers.id) feedback,
    ARRAY(
        LANG cypher
        MATCH ({id: customers.id})<-[:hasCreator]-(post)
        WHERE post.creationDate > date.sub(date('2011-12-31'), interval('1 month'))
        RETURN post
    ) posts
FROM customers
WHERE id = 4145
    `,
}, {
    name: 'Query 2',
    defaultLanguage: 'sql',
    query: `
-- Query 2
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
-- Query 3
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
// Query 4
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
// Query 5
// what did the friends of CUSTOMER which bought BRAND products post about?
//
// example customer id: 6192
// example brand: Reebok

MATCH (:person {id: 6192})-[:knows]->(person)<-[:hasCreator]-()-[:hasTag]->(tag)
WHERE EXISTS {
    LANG xquery
    $invoices/Invoices/Invoice.xml[PersonId=$person/@id]/Orderline[brand="Reebok"]
}
RETURN DISTINCT tag.id
    `,
}, {
    name: 'Query 6',
    // This query isn't in the other databases so there is no point in measuring it. The same is true for the following queries.
    excludeFromTests: true,
    defaultLanguage: 'sql',
    query: `
-- Query 6
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
    excludeFromTests: true,
    defaultLanguage: 'sql',
    query: `
-- Query 7
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
    excludeFromTests: true,
    defaultLanguage: 'sql',
    query: `
-- Query 8
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
    excludeFromTests: true,
    defaultLanguage: 'sql',
    query: `
-- Query 9
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
    excludeFromTests: true,
    defaultLanguage: 'sql',
    query: `
-- Query 10
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
        WHERE personId = orders.PersonId::number
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
    excludeFromTests: example.excludeFromTests,
}));
