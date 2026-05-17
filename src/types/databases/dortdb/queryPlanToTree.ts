import type { PlanNode } from '../../database';
import { ASTIdentifier, type PlanVisitor, type PlanOperator, allAttrs, type Aliased } from '@dortdb/core';
import * as plan from '@dortdb/core/plan';
import { type ProjectionSize, type TreeJoin, type XQueryPlanVisitor } from '@dortdb/lang-xquery';
import type * as operators from '@dortdb/core/plan';

export function queryPlanToTree(op: PlanOperator): PlanNode {
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
