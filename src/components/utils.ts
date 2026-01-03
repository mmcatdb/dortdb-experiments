import { twMerge } from 'tailwind-merge';

export const cn = twMerge;

export function plural(count: number, singular: string, plural?: string): string {
    if (count === 1)
        return singular;

    return plural ?? (singular + 's');
}
