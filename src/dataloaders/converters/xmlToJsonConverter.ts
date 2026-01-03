import { type JsonValue, type JsonObject } from '@/types/schema';

export function convertXmlToJson(input: Document): JsonObject[] {
    const root = elementToJson(input.documentElement);
    const entries = Object.entries(root as JsonObject);
    if (entries.length !== 1)
        throw new Error('Expected a single root element in the XML document. Also, XML sucks.');

    return entries[0][1] as JsonObject[];
}

function elementToJson(element: Element): JsonObject | string {
    const children = [ ...element.children ];

    // If element has no child elements, it's a leaf node.
    if (children.length === 0)
        // There is no standardized way to represent null values in XML (they are still debating about it today, even though nobody uses XML for more than 20 years now) ... so let's just hope there aren't any.
        return element.textContent.trim();

    const output: Record<string, JsonValue> = {};

    for (const child of children) {
        const key = child.tagName;
        const value = elementToJson(child);

        if (key in output) {
            const existing = output[key];
            // Lol, there is no notion of arrays in XML ... it's even worse than I thought ...
            if (Array.isArray(existing))
                existing.push(value);
            else
                output[key] = [ existing, value ];
        }
        else {
            output[key] = value;
        }
    }

    return output;
}
