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

export function SpinnerIcon() {
    return (
        <svg className='animate-spin size-5' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
            <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
            <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
        </svg>
    );
}
