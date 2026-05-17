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


select
    s.acctbal,
    s.name as "s.name",
    n.name as "n.name",
    p.partkey,
    p.mfgr,
    s.address,
    s.phone,
    s.comment
from
    part p,
    supplier s,
    partsupp ps,
    nation n,
    region r
where
    p.partkey = ps.partkey
    and s.suppkey = ps.suppkey
    and p.size = 31
    and p.type like '%NICKEL'
    and s.nationkey = n.nationkey
    and n.regionkey = r.regionkey
    and r.name = 'AMERICA'
    and ps.supplycost = (
        select
            min(ps.supplycost)
        from
            partsupp ps,
            supplier s,
            nation n,
            region r
        where
            p.partkey = ps.partkey
            and s.suppkey = ps.suppkey
            and s.nationkey = n.nationkey
            and n.regionkey = r.regionkey
            and r.name = 'AMERICA'
    )
order by
    s.acctbal desc,
    n.name,
    s.name,
    p.partkey
limit 100;
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
    and date(o.orderdate) >= date('1997-01-01')
    and date(o.orderdate) < date('1997-01-01', '+1 years')
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
from
    (
        select
            n1.name as supp_nation,
            n2.name as cust_nation,
            cast (strftime('%Y', l.shipdate) as integer) as year,
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
            and date(l.shipdate) between date('1995-01-01') and date('1996-12-31')
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
