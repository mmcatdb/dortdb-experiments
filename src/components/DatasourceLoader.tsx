import { Button, Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from './shadcn';
import { loadDatasource } from '@/dataloaders';
import { type Database } from '@/types/database';
import { type Dispatch, useState } from 'react';
import { CheckIcon, TriangleAlertIcon } from 'lucide-react';
import { type SchemaType, type DatasourceSchema } from '@/types/schema';
import { printProgress, type Progress, updateUI } from '@/dataloaders/utils';
import { SpinnerIcon } from './Common';

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
                    <SpinnerIcon />

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
