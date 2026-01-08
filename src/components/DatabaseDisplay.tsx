import { type Dispatch, Fragment, useId, useMemo, useState } from 'react';
import type { Database, DortdbLanguage, ExampleQuery, PlanNode, QueryOutput, QueryOutputValue, Result } from '@/types/database';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Label, RadioGroup, RadioGroupItem, Textarea } from './shadcn';
import { ChevronDownIcon } from 'lucide-react';
import { plural, timeQuantity } from './utils';
import { updateUI } from '@/dataloaders/utils';

type DatabaseDisplayProps = {
    db: Database;
    className?: string;
};

export function DatabaseDisplay({ db, className }: DatabaseDisplayProps) {
    const [ query, setQuery ] = useState(db.getDefaultQuery());
    const [ defaultLanguage, setDefaultLanguage ] = useState<DortdbLanguage>('sql');

    const [ isExecuting, setIsExecuting ] = useState(false);
    const [ result, setResult ] = useState<QueryResult | ExplainResult>();

    async function executeQuery() {
        if (!query.trim()) {
            console.log('Empty query, skipping execution.');
            setResult(undefined);
            return;
        }

        console.log('Executing query on db:', db.type);

        setIsExecuting(true);

        await updateUI();

        const start = performance.now();
        const output = db.query(query, defaultLanguage);
        const end = performance.now();
        const executionTimeMs = end - start;

        console.log('Query output:', output);

        if (output.status)
            console.log(`Query success: ${output.data.rows.length} rows in ${executionTimeMs} ms`);
        else
            console.log('Query error:', output.error);

        setIsExecuting(false);
        setResult({ type: 'query', output, executionTimeMs });
    }

    function explainQuery() {
        if (!db.explain) {
            console.error(`Database ${db.type} does not support EXPLAIN.`);
            return;
        }

        if (!query.trim()) {
            console.log('Empty query, skipping EXPLAIN.');
            setResult(undefined);
            return;
        }

        console.log('Explaining query on db:', db.type);

        const output = db.explain(query, defaultLanguage);
        if (output.status)
            console.log('EXPLAIN success:', output.data);
        else
            console.log('EXPLAIN error:', output.error);

        setResult({ type: 'explain', output });
    }

    function selectExample({ query, defaultLanguage }: ExampleQuery) {
        setQuery(query);
        if (defaultLanguage)
            setDefaultLanguage(defaultLanguage);
    }

    const queryId = useId();
    const defaultLanguageId = useId();
    const examples = db.getExamples?.();

    return (
        <div className={className}>
            <h2 className='mb-2 text-lg font-semibold'>{db.type} Example</h2>

            <Label htmlFor={queryId}>Query:</Label>
            <Textarea
                className='mt-2 font-mono'
                id={queryId}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter' && e.ctrlKey)
                        executeQuery();
                }}
            />

            {db.type === 'DortDB' && (<>
                <Label className='mt-2'>Default Language:</Label>
                <RadioGroup value={defaultLanguage} onValueChange={setDefaultLanguage as Dispatch<string>} className='mt-2 flex gap-6'>
                    {languages.map(language => (
                        <div key={language} className='flex items-center gap-3'>
                            <RadioGroupItem id={defaultLanguageId + language} value={language} />
                            <Label htmlFor={defaultLanguageId + language}>{language}</Label>
                        </div>
                    ))}
                </RadioGroup>
            </>)}

            <div className='mt-2 flex items-center gap-2'>
                <Button variant='outline' onClick={executeQuery} disabled={isExecuting}>Execute</Button>

                {examples && (
                    <ExampleSelect options={examples} onSelect={selectExample} />
                )}

                {db.explain && (
                    <Button variant='outline' onClick={explainQuery} disabled={isExecuting}>Explain</Button>
                )}

                {result?.type === 'query' && (
                    <ToggleExpandButton result={result} setResult={setResult} />
                )}
            </div>

            {result && (
                result.type === 'query' ? (
                    <QueryResultDisplay result={result} setResult={setResult} />
                ) : (
                    <ExplainResultDisplay result={result} />
                )
            )}
        </div>
    );
}

type QueryResult = {
    type: 'query';
    output: Result<QueryOutput>;
    executionTimeMs: number;
    isExpanded?: boolean;
};

type ExplainResult = {
    type: 'explain';
    output: Result<PlanNode>;
};

const languages: DortdbLanguage[] = [ 'sql', 'cypher', 'xquery' ];

function errorToString(error: unknown): string {
    if (error instanceof Error)
        return error.message;

    return JSON.stringify(error, null, 4);
}

type ExampleSelectProps = {
    options: ExampleQuery[];
    onSelect: Dispatch<ExampleQuery>;
};

function ExampleSelect({ options, onSelect }: ExampleSelectProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant='outline'>
                    Example <ChevronDownIcon size={16} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                {options.map(example => (
                    <DropdownMenuItem key={example.name} onClick={() => onSelect(example)}>
                        {example.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const NOT_EXPANDED_ROWS = 1;

type QueryResultDisplayProps = {
    result: QueryResult;
    setResult: Dispatch<QueryResult>;
};

function QueryResultDisplay({ result, setResult }: QueryResultDisplayProps) {
    const { output, executionTimeMs, isExpanded } = result;

    return (
        <div className='mt-2 space-y-1'>
            <div className='flex items-baseline gap-4'>
                <h3 className='text-md font-semibold'>Result:</h3>

                {output.status && (
                    <div className='text-sm font-medium text-muted-foreground'>
                        {/* Tenths of milliseconds is probably the best we can do here. */}
                        {`${output.data.rows.length} ${plural(output.data.rows.length, 'row')} in ${timeQuantity.prettyPrint(executionTimeMs)}`}
                    </div>
                )}
            </div>

            {output.status ? (<>
                <div className='grid gap-1' style={{ gridTemplateColumns: `repeat(${output.data.columns.length}, minmax(0, max-content))` }}>

                    {output.data.rows.length > 0 && output.data.columns.map((column, index) => (
                        <div key={index} className='px-2 py-1 rounded-md bg-accent/50 font-mono text-sm font-semibold truncate'>
                            {column}
                        </div>
                    ))}

                    {(isExpanded ? output.data.rows : output.data.rows.slice(0, NOT_EXPANDED_ROWS)).map((row, rowIndex) => (
                        <Fragment key={rowIndex}>
                            {output.data.columns.map((column, colIndex) => (
                                <pre key={colIndex} className='px-2 py-1 rounded-md bg-accent text-sm text-wrap truncate'>
                                    {stringifyQueryOutputValue(row[column])}
                                </pre>
                            ))}
                        </Fragment>
                    ))}
                </div>

                <ToggleExpandButton result={result} setResult={setResult} />
            </>) : (
                <ErrorDisplay error={output.error} />
            )}
        </div>
    );
}

function stringifyQueryOutputValue(value: QueryOutputValue): string {
    switch (typeof value) {
    case 'string':
        return value;
    case 'number':
    case 'boolean':
        return value.toString();
    default:
        return JSON.stringify(value);
    }
}

function ToggleExpandButton({ result, setResult }: QueryResultDisplayProps) {
    if (!result.output.status || result.output.data.rows.length <= NOT_EXPANDED_ROWS)
        return null;

    return result.isExpanded ? (
        <Button variant='outline' onClick={() => setResult({ ...result, isExpanded: false })}>
            Show less
        </Button>
    ) : (
        <Button variant='outline' onClick={() => setResult({ ...result, isExpanded: true })}>
            {`Show all ${result.output.data.rows.length} ${plural(result.output.data.rows.length, 'row')}`}
        </Button>
    );
}

type ExplainResultDisplayProps = {
    result: ExplainResult;
};

function ExplainResultDisplay({ result }: ExplainResultDisplayProps) {
    const planString = useMemo(() => result.output.status ? planNodeToLines(result.output.data).join('\n') : undefined, [ result ]);

    return (
        <div className='mt-2'>
            <h3 className='mb-2 text-md font-semibold'>Query Plan:</h3>

            {result.output.status ? (
                <pre className='px-2 py-1 rounded-md bg-accent text-sm text-wrap'>
                    {planString}
                </pre>
            ) : (
                <ErrorDisplay error={result.output.error} />
            )}
        </div>
    );
}

function planNodeToLines(node: PlanNode): string[] {
    const output = [ node.label ];

    if (node.children.length === 0)
        return output;

    if (DO_FLATTEN_IF_SINGLE_CHILD &&node.children.length === 1) {
        const firstChildLines = planNodeToLines(node.children[0]);
        output.push('|', ...firstChildLines);
        return output;
    }

    for (let i = 0; i < node.children.length; i++) {
        const childLines = planNodeToLines(node.children[i]);
        const isLast = (i === node.children.length - 1);

        const firstPrefix = isLast ? '└── ' : '├── ';
        output.push(firstPrefix + childLines[0]);

        const otherPrefix = isLast ? '    ' : '│   ';
        for (let j = 1; j < childLines.length; j++)
            output.push(otherPrefix + childLines[j]);
    }

    return output;
}

const DO_FLATTEN_IF_SINGLE_CHILD = false;

function ErrorDisplay({ error }: { error: unknown }) {
    return (
        <pre className='px-2 py-1 rounded-md bg-accent text-sm text-wrap text-destructive'>Error: {errorToString(error)}</pre>
    );
}
