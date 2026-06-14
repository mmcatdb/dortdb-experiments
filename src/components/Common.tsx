import { useState } from 'react';
import { Button } from './shadcn';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { cn } from './utils';

type CopyToClipboardButtonProps = {
    text: string | (() => string);
    className?: string;
};

export function CopyToClipboardButton({ text, className }: CopyToClipboardButtonProps) {
    const [ isCopied, setIsCopied ] = useState(false);

    async function copy() {
        try {
            const string = typeof text === 'function' ? text() : text;
            await navigator.clipboard.writeText(string);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 10_000);
        }
        catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    }

    return (
        <Button variant='outline' className={cn('size-9', className)} onClick={copy}>
            {isCopied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
        </Button>
    );
}
