import { type Dispatch, useId, useMemo, useState } from 'react';
import { type ExampleQueries, stringifyQueryOutputObject, type Database, type DortdbLanguage, type ExampleQuery, type PlanNode, type QueryOutput, type Result } from '@/types/database';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Label, RadioGroup, RadioGroupItem, ScrollArea, Textarea } from './shadcn';
import { ChevronDownIcon } from 'lucide-react';
import { plural, prettyPrintInt, timeQuantity } from './utils';
import { updateUI } from '@/dataloaders/utils';
import { type DatasourceSchema, type SchemaType } from '@/types/schema';
import { CopyToClipboardButton } from './Common';

type DatabaseDisplayProps = {
    db: Database;
    loadedSchema: DatasourceSchema | undefined;
    schemaLabels: Record<SchemaType, string>;
    className?: string;
};

export function DatabaseDisplay({ db, loadedSchema, schemaLabels, className }: DatabaseDisplayProps) {
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
                    <ExampleSelect options={examples} onSelect={selectExample} loadedSchema={loadedSchema} schemaLabels={schemaLabels} />
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
    options: ExampleQueries;
    onSelect: Dispatch<ExampleQuery>;
    loadedSchema: DatasourceSchema | undefined;
    schemaLabels: Record<SchemaType, string>;
};

function ExampleSelect({ options, onSelect, loadedSchema, schemaLabels }: ExampleSelectProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant='outline'>
                    Example <ChevronDownIcon size={16} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                {Object.entries(options).map(([ schemaType, examples ]) => (
                    <DropdownMenuGroup key={schemaType} className='group'>
                        <DropdownMenuLabel className='text-muted-foreground'>
                            {schemaLabels[schemaType]}

                            {schemaType !== loadedSchema?.type && (
                                <span className='ml-2 text-xs text-destructive'>(not loaded)</span>
                            )}
                        </DropdownMenuLabel>

                        {examples.map(example => (
                            <DropdownMenuItem key={example.name} onClick={() => onSelect(example)} className='pl-4'>
                                {example.name}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator className='group-last:hidden' />
                    </DropdownMenuGroup>
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

    const stringifiedRows = useMemo(() => {
        if (!output.status)
            return;

        const rows = isExpanded ? output.data.rows : output.data.rows.slice(0, NOT_EXPANDED_ROWS);
        return rows.map(row => stringifyQueryOutputObject(row));
    }, [ output, isExpanded ]);

    return (
        <div className='mt-2 space-y-1'>
            <div className='flex items-baseline gap-4'>
                <h3 className='text-md font-semibold'>Result:</h3>

                {output.status && (<>
                    <div className='text-sm font-medium text-muted-foreground'>
                        {/* Tenths of milliseconds is probably the best we can do here. */}
                        {`${output.data.rows.length} ${plural(output.data.rows.length, 'row')} in ${timeQuantity.prettyPrint(executionTimeMs)}`}
                    </div>

                    {stringifiedRows!.length > 0 && (
                        <div className='text-sm font-medium text-muted-foreground'>
                            {prettyPrintInt(stringifiedRows![0].length)} characters shown
                        </div>
                    )}
                </>)}
            </div>

            {output.status ? (<>
                {stringifiedRows!.map((row, index) => (
                    <ScrollArea key={index} className='max-h-100 flex flex-col rounded-md bg-accent'>
                        <pre key={index} className='px-2 py-1 text-sm text-wrap'>
                            {row}
                        </pre>
                        <CopyToClipboardButton text={row} className='absolute top-2 right-2' />
                    </ScrollArea>
                ))}

                <ToggleExpandButton result={result} setResult={setResult} />
            </>) : (
                <ErrorDisplay error={output.error} />
            )}
        </div>
    );
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
