import { Button, Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from './shadcn';
import { loadDatasource, type Progress } from '@/dataloaders';
import { type Database } from '@/types/database';
import { type Dispatch, useState } from 'react';
import { CheckIcon, TriangleAlertIcon } from 'lucide-react';
import { type SchemaType, type DatasourceSchema } from '@/types/schema';
import { updateUI } from '@/dataloaders/utils';

type DatasourceLoaderProps = {
    schemas: DatasourceSchemas;
    loadedSchema: DatasourceSchema | undefined;
    setLoadedSchema: Dispatch<DatasourceSchema>;
    dbs: Database[];
    schemaLabels: Record<SchemaType, string>;
};

type DatasourceSchemas = Record<SchemaType, DatasourceSchema[]>;

export function DatasourceLoader({ schemas, loadedSchema, setLoadedSchema, dbs, schemaLabels }: DatasourceLoaderProps) {
    const [ schema, setSchema ] = useState<DatasourceSchema>(Object.values(schemas)[0][0]);
    const [ isLoading, setIsLoading ] = useState(false);
    const [ progress, setProgress ] = useState<Progress>();

    async function loadData() {
        console.log(`Loading ${schema.label} data (${schema.file.path}) ...`);
        setIsLoading(true);

        const data = await loadDatasource(schema, setProgress);
        console.log('Data loaded');

        for (const db of dbs) {
            const process = `Inserting data into ${db.type}`;
            console.log(process);
            setProgress({ process, done: 0 });
            await updateUI();

            await db.setData(schema, data, done => {
                setProgress({ process, done });
                return updateUI();
            });

            console.log(`Data inserted into ${db.type}`);
        }

        setIsLoading(false);
        setLoadedSchema(schema);
    };

    const isLoaded = loadedSchema === schema;

    return (
        <div className='flex items-center gap-4'>
            <SchemaSelect schemas={schemas} schema={schema} onSelect={setSchema} schemaLabels={schemaLabels} />

            <Button onClick={loadData} disabled={isLoaded || isLoading}>
                Load Data
            </Button>

            {isLoading ? (
                <div className='flex items-center gap-3 text-blue-500'>
                    <svg className='animate-spin size-5' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                        <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                        <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                    </svg>

                    {progress && (
                        <div>{printProgress(progress)}</div>
                    )}
                </div>
            ) : isLoaded ? (
                <div className='flex items-center gap-2 text-green-500'>
                    <CheckIcon /> Data loaded
                </div>
            ) : (
                <div className='flex items-center gap-3 text-yellow-500'>
                    <TriangleAlertIcon size={20} /> No data loaded yet
                </div>
            )}
        </div>
    );
}

function printProgress(progress: Progress) {
    let output = `${progress.process} ...`;
    if (progress.done !== undefined)
        output += ` ${(progress.done * 100).toFixed(0).padStart(3, ' ')} %`;

    return output;
}

type ExampleSelectProps = {
    schemas: DatasourceSchemas;
    schema: DatasourceSchema;
    onSelect: Dispatch<DatasourceSchema>;
    schemaLabels: Record<SchemaType, string>;
};

function SchemaSelect({ schemas, schema, onSelect, schemaLabels }: ExampleSelectProps) {
    function selectSchema(label: string) {
        for (const variants of Object.values(schemas)) {
            const found = variants.find(v => v.label === label);
            if (found) {
                onSelect(found);
                return;
            }
        }
    }

    return (
        <Select value={schema.label} onValueChange={selectSchema}>
            <SelectTrigger>
                <SelectValue placeholder='Select a datasource' />
            </SelectTrigger>
            <SelectContent>
                {Object.entries(schemas).map(([ schemaType, variants ]) => (
                    <SelectGroup key={schemaType} className='group'>
                        <SelectLabel className='text-muted-foreground'>{schemaLabels[schemaType]}</SelectLabel>

                        {variants.map(variant => (
                            <SelectItem key={variant.label} value={variant.label} className='pl-4'>
                                {variant.label}
                            </SelectItem>
                        ))}
                        <SelectSeparator className='group-last:hidden' />
                    </SelectGroup>
                ))}
            </SelectContent>
        </Select>
    );
}
