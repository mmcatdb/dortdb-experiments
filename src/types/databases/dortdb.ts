import { type Result, successResult, type Database, errorResult, type ExampleQuery, type DortdbLanguage, type PlanNode, type QueryOutputObject, type QueryOutput } from '../database';
import { ASTIdentifier, datetime, DortDB, MapIndex, type PlanVisitor, type PlanOperator, allAttrs, type Aliased } from '@dortdb/core';
import * as plan from '@dortdb/core/plan';
import { defaultRules } from '@dortdb/core/optimizer';
import { SQL } from '@dortdb/lang-sql';
import { ConnectionIndex, Cypher } from '@dortdb/lang-cypher';
import { type ProjectionSize, type TreeJoin, XQuery, type XQueryPlanVisitor } from '@dortdb/lang-xquery';
import { type DatasourceData, type DatasourceSchema } from '../schema';
import type * as operators from '@dortdb/core/plan';

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
        const kinds = [ ...schema.common, ...schema.multimodelOnly ];

        for (const kind of kinds) {
            const kindData = data.multimodel[kind.key];
            if (!kindData)
                throw new Error(`No data found for kind "${kind.key}".`);

            this.innerDb.registerSource([ kind.key ], kindData);
        }

        await onProgress?.(1 / 2);

        for (const kind of kinds) {
            switch (kind.type) {
            case 'table':
                kind.columns
                    .filter(col => col.isPrimaryKey || col.references || col.isUnique)
                    .forEach(col => {
                        this.innerDb.createIndex([ kind.key ], [ col.name ], MapIndex);
                    });
                break;
            case 'document':
                for (const index of kind.indexes ?? [])
                    this.innerDb.createIndex([ kind.key ], [ index ], MapIndex);
                break;
            case 'graph': {
                this.innerDb.createIndex([ kind.key, 'nodes' ], [], ConnectionIndex);
                this.innerDb.createIndex([ kind.key, 'nodes' ], [ 'x.id' ], MapIndex, { fromItemKey: [ 'x' ], mainLang: 'cypher' });
                this.innerDb.createIndex([ kind.key, 'edges' ], [], ConnectionIndex);
                break;
            }
            }
        }
    }

    setRawData(kindName: string, data: unknown): void {
        this.innerDb.registerSource([ kindName ], data);
    }

    query(sql: string, defaultLanguage?: DortdbLanguage): Result<QueryOutput> {
        try {
            const { data, schema } = this.innerDb.query<QueryOutputObject>(sql, defaultLanguage && { mainLang: defaultLanguage });

            let columns = schema ?? [ 'value' ];
            // Let's just say this string comparison is highly not ideal, but it's not our fault.
            if (columns.length === 1 && columns[0] === allAttrs.toString()) {
                // Expand * to all columns in the first row.
                columns = data.length > 0 ? Object.keys(data[0]) : [];
            }

            const rows: QueryOutputObject[] = schema
                ? data
                : data.map(value => ({ value }));

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
        return examples;
    }

    explain(sql: string, defaultLanguage?: DortdbLanguage): Result<PlanNode> {
        try {
            const options = defaultLanguage && { mainLang: defaultLanguage };
            const parsed = this.innerDb.parse(sql, options);
            const plan = this.innerDb.buildPlan(parsed.at(-1)!, options);

            return successResult(queryPlanToTree(plan));
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

const examples: ExampleQuery[] = [ {
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
}));

function queryPlanToTree(op: PlanOperator): PlanNode {
    const converter = new OperatorToPlanNodeConverter();
    return converter.accept(op);
}

class OperatorToPlanNodeConverter implements PlanVisitor<PlanNode>, XQueryPlanVisitor<PlanNode> {
    private vmap: Record<string, OperatorToPlanNodeConverter> = {};

    constructor() {
        this.vmap = {
            'sql': this,
            'cypher': this,
            'xquery': this,
        };
    }

    accept(op: PlanOperator): PlanNode {
        return op.accept(this.vmap);
    }

    private draw(label: string, ...children: PlanOperator[]): PlanNode {
        return {
            label,
            children: children.map(child => this.accept(child)),
        };
    }

    private argument(arg: ASTIdentifier | PlanOperator): string {
        return arg instanceof ASTIdentifier ? this.id(arg) : '_';
    }

    private attribute([ attr, alias ]: Aliased<ASTIdentifier | plan.Calculation>): string {
        const aliasStr = this.id(alias);
        if (attr instanceof ASTIdentifier) {
            const attrStr = this.id(attr);
            return attrStr === aliasStr ? attrStr : `${aliasStr}=${attrStr}`;
        }
        return aliasStr;
    }

    private id(id: ASTIdentifier): string {
        const full = id.parts
            .map(x => typeof x === 'string' ? x : x === allAttrs ? '*' : x?.toString())
            .join('.');
        if (full.length < OperatorToPlanNodeConverter.MAX_ID_LENGTH)
            return full;

        return `${full.slice(0, OperatorToPlanNodeConverter.MAX_ID_LENGTH - 3)}...`;
    }

    static readonly MAX_ID_LENGTH = 30;

    visitRecursion(op: operators.Recursion) {
        return this.draw(`recursion(${op.min}, ${op.max}, ${this.argument(op.condition)})`,
            op.source,
            op.condition,
        );
    };
    visitIndexedRecursion(op: operators.IndexedRecursion) {
        return this.draw(`indexedRecursion(${op.min}, ${op.max})`,
            op.source,
            op.mapping,
        );
    };
    visitBidirectionalRecursion(operator: plan.BidirectionalRecursion) {
        return this.draw(`bidirectionalRecursion(${operator.min}, ${operator.max})`,
            operator.mappingRev,
            operator.source,
            operator.target,
            operator.mappingFwd,
        );
    }

    visitProjection(op: operators.Projection) {
        const attributes = op.attrs.map(a => this.attribute(a)).join(', ');
        return this.draw(`projection(${attributes})`,
            op.source,
            ...op.attrs.map(([ a ]) => a).filter(a => a instanceof plan.Calculation),
        );
    };
    visitSelection(op: operators.Selection) {
        const argument = this.argument(op.condition);
        return this.draw(`selection(${argument})`,
            op.source,
            op.condition,
        );
    };
    visitTupleSource(op: operators.TupleSource) {
        const name = op.name instanceof ASTIdentifier ? this.id(op.name) : this.attribute(op.name);
        return this.draw(`tupleSource(${name})`);
    };
    visitItemSource(op: operators.ItemSource) {
        const name = op.name instanceof ASTIdentifier ? this.id(op.name) : this.attribute(op.name);
        return this.draw(`itemSource(${name})`);
    };
    visitFnCall(op: operators.FnCall) {
        console.log('not implemented fnCall operator:', op);
        return this.draw('fnCall');
    };
    visitLiteral(op: operators.Literal) {
        console.log('not implemented literal operator:', op);
        return this.draw('literal');
    };
    visitCalculation(op: operators.Calculation) {
        const args = op.args.map(arg => this.argument(arg)).join(', ');
        return this.draw(`calculation(${args})`,
            ...op.args.filter(arg => !(arg instanceof ASTIdentifier)) as PlanOperator[],
        );
    };
    visitConditional(op: operators.Conditional) {
        console.log('not implemented conditional operator:', op);
        return this.draw('conditional');
    };
    visitCartesianProduct(op: operators.CartesianProduct) {
        return this.draw('cartesianProduct',
            op.left,
            op.right,
        );
    };
    visitJoin(op: operators.Join) {
        const conditions = op.conditions.map(c => this.argument(c)).join(', ');
        const prefix = op.leftOuter ? 'leftOuter ' : op.rightOuter ? 'rightOuter ' : '';
        return this.draw(`${prefix}join(${conditions})`,
            ...op.conditions,
            op.left,
            op.right,
        );
    };
    visitProjectionConcat(op: operators.ProjectionConcat) {
        const prefix = op.outer ? 'outer ' : '';
        return this.draw(`${prefix}projectionConcat`,
            op.source,
            op.mapping,
        );
    };
    visitMapToItem(op: operators.MapToItem) {
        return this.draw(`mapToItem(${this.id(op.key)})`,
            op.source,
        );
    };
    visitMapFromItem(op: operators.MapFromItem) {
        return this.draw(`mapFromItem(${this.id(op.key)})`,
            op.source,
        );
    };
    visitProjectionIndex(op: operators.ProjectionIndex) {
        return this.draw(`projectionIndex${this.id(op.indexCol)}`,
            op.source,
        );
    };
    visitOrderBy(op: operators.OrderBy) {
        const args = op.orders.map(o => `${this.argument(o.key)} ${o.ascending ? 'ASC' : 'DESC'}`).join(', ');
        return this.draw(`orderBy(${args})`,
            op.source,
            ...op.orders.map(o => o.key).filter(k => k instanceof plan.Calculation),
        );
    };
    visitGroupBy(op: operators.GroupBy) {
        const keys = op.keys.map(k => this.attribute(k)).join(', ');
        const aggregations = op.aggs.map(a => this.id(a.fieldName)).join(', ');
        return this.draw(`groupBy([${keys}], [${aggregations}])`,
            op.source,
            ...op.keys.map(([ k ]) => k).filter(k => k instanceof plan.Calculation),
            ...op.aggs,
        );
    };
    visitLimit(op: operators.Limit) {
        return this.draw(`limit(${op.limit}, ${op.skip})`,
            op.source,
        );
    };
    visitUnion(op: operators.Union) {
        return this.draw('union',
            op.left,
            op.right,
        );
    };
    visitIntersection(op: operators.Intersection) {
        return this.draw('intersection',
            op.left,
            op.right,
        );
    };
    visitDifference(op: operators.Difference) {
        return this.draw('difference',
            op.left,
            op.right,
        );
    };
    visitDistinct(op: operators.Distinct) {
        if (op.attrs === allAttrs) {
            return this.draw('distinct(*)',
                op.source,
            );
        }

        const args = op.attrs.map(a => this.argument(a)).join(', ');
        return this.draw(`distinct(${args})`,
            op.source,
            ...op.attrs.filter(a => a instanceof plan.Calculation),
        );
    };
    visitNullSource(op: operators.NullSource) {
        return this.draw(`nullSource(${op.lang})`);
    };
    visitAggregate(op: operators.AggregateCall) {
        console.log('not implemented aggregateCall operator:', op);
        return this.draw('aggregateCall');
    };
    visitItemFnSource(op: operators.ItemFnSource) {
        const args = op.args.map(a => this.argument(a)).join(', ');
        const name = op.name ? op.name instanceof ASTIdentifier ? this.id(op.name) : this.attribute(op.name) : 'function';
        return this.draw(`itemFnSource ${name}(${args})`,
            ...op.args.filter(a => a instanceof plan.Calculation),
        );
    };
    visitTupleFnSource(op: operators.TupleFnSource) {
        const args = op.args.map(a => this.argument(a)).join(', ');
        const name = op.name ? op.name instanceof ASTIdentifier ? this.id(op.name) : this.attribute(op.name) : 'function';
        return this.draw(`tupleFnSource ${name}(${args})`,
            ...op.args.filter(a => a instanceof plan.Calculation),
        );
    };
    visitQuantifier(op: operators.Quantifier) {
        console.log('not implemented quantifier operator:', op);
        return this.draw('quantifier');
    };
    visitIndexScan(op: operators.IndexScan) {
        return this.draw(`indexScan(${this.id(op.name as ASTIdentifier)}, ${this.argument(op.access)})`);
    };
    visitTreeJoin(op: TreeJoin): PlanNode {
        return this.draw('treeJoin',
            op.source,
            op.step,
        );
    }
    visitProjectionSize(op: ProjectionSize): PlanNode {
        return this.draw(`projectionSize(${this.id(op.sizeCol)})`,
            op.source,
        );
    }
}
