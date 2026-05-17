import type { ExampleQuery } from '@/types/database';

export const tpchExamples: ExampleQuery[] = [ {
    name: 'Query 2',
    query: `
-- TPC TPC-H Parameter Substitution (Version 2.17.3 build 0)
-- using 1752693157 as a seed to the RNG
-- $ID$
-- TPC-H/TPC-R Minimum Cost Supplier Query (Q2)
-- Functional Query Definition
-- Approved February 1998


SELECT
    s.acctbal,
    s.name AS "s.name",
    n.name AS "n.name",
    p.partkey,
    p.mfgr,
    s.address,
    s.phone,
    s.comment
FROM part p
JOIN partsupp ps ON p.partkey = ps.partkey
JOIN supplier s ON s.suppkey = ps.suppkey
JOIN nation n ON s.nationkey = n.nationkey
JOIN region r ON n.regionkey = r.regionkey
JOIN (
    SELECT
        ps2.partkey,
        MIN(ps2.supplycost) AS min_supplycost
    FROM partsupp ps2
    JOIN supplier s2 ON s2.suppkey = ps2.suppkey
    JOIN nation n2 ON s2.nationkey = n2.nationkey
    JOIN region r2 ON n2.regionkey = r2.regionkey
    WHERE r2.name = 'AMERICA'
    GROUP BY ps2.partkey
) mins
    ON mins.partkey = p.partkey
   AND mins.min_supplycost = ps.supplycost
WHERE
    p.size = 31
    AND p.type LIKE '%NICKEL'
    AND r.name = 'AMERICA'
ORDER BY
    s.acctbal DESC,
    n.name,
    s.name,
    p.partkey
LIMIT 100;
    `,
}, {
    name: 'Query 5',
    query: `
-- TPC TPC-H Parameter Substitution (Version 2.17.3 build 0)
-- using 1752693157 as a seed to the RNG
-- $ID$
-- TPC-H/TPC-R Local Supplier Volume Query (Q5)
-- Functional Query Definition
-- Approved February 1998


select
    n.name,
    sum(l.extendedprice * (1 - l.discount)) as revenue
from
    customer c,
    orders o,
    lineitem l,
    supplier s,
    nation n,
    region r
where
    c.custkey = o.custkey
    and l.orderkey = o.orderkey
    and l.suppkey = s.suppkey
    and c.nationkey = s.nationkey
    and s.nationkey = n.nationkey
    and n.regionkey = r.regionkey
    and r.name = 'ASIA'
    and o.orderdate >= '1997-01-01'
    and o.orderdate < '1998-01-01'
group by
    n.name
order by
    revenue desc;
    `,
}, {
    name: 'Query 7',
    query: `
-- TPC TPC-H Parameter Substitution (Version 2.17.3 build 0)
-- using 1752693157 as a seed to the RNG
-- $ID$
-- TPC-H/TPC-R Volume Shipping Query (Q7)
-- Functional Query Definition
-- Approved February 1998


select
    shipping.supp_nation,
    shipping.cust_nation,
    shipping.year,
    sum(shipping.volume) as revenue
from (
    select
        n1.name as supp_nation,
        n2.name as cust_nation,
        YEAR(l.shipdate) as year,
        l.extendedprice * (1 - l.discount) as volume
    from
        supplier s,
        lineitem l,
        orders o,
        customer c,
        nation n1,
        nation n2
    where
        s.suppkey = l.suppkey
        and o.orderkey = l.orderkey
        and c.custkey = o.custkey
        and s.nationkey = n1.nationkey
        and c.nationkey = n2.nationkey
        and (
            (n1.name = 'ROMANIA' and n2.name = 'BRAZIL')
            or (n1.name = 'BRAZIL' and n2.name = 'ROMANIA')
        )
        and l.shipdate between '1995-01-01' and '1996-12-31'
) as shipping
group by
    shipping.supp_nation,
    shipping.cust_nation,
    shipping.year
order by
    shipping.supp_nation,
    shipping.cust_nation,
    shipping.year;
    `,
} ].map(example => ({
    name: example.name,
    query: example.query.trim(),
    defaultLanguage: 'sql',
}));
