import type { DecodedHeader, HeaderLine, LibmimeOptions } from './types';

declare class Headers {
    changed: boolean;
    headers: string | Buffer | false;
    parsed: boolean;
    lines: HeaderLine[] | false;
    mbox: string | false;
    http: string | false;

    constructor(headers?: string | Buffer | HeaderLine[] | false, config?: LibmimeOptions);
    hasHeader(key: string): boolean;
    get(key: string): string[];
    getDecoded(key: string): DecodedHeader[];
    getFirst(key: string): string;
    getList(): HeaderLine[];
    add(key: string, value?: string | number | Buffer, index?: number): void;
    addFormatted(key: string, line?: string | Buffer | false, index?: number): void;
    remove(key: string): void;
    update(key: string, value?: string | number | Buffer, relativeIndex?: number): void;
    build(lineEnd?: string | false): Buffer;
}

export = Headers;
