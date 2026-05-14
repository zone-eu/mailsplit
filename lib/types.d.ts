import type { PassThrough, Transform } from 'node:stream';
import type Headers = require('./headers');

export type Maybe<T> = T | false;
export type PartNumberItem = number | 'TEXT';
export type PartNumber = PartNumberItem[];

export interface LibmimeOptions {
    Iconv?: unknown;
}

export interface SplitterOptions extends LibmimeOptions {
    ignoreEmbedded?: boolean;
    defaultInlineEmbedded?: boolean;
    maxHeadSize?: number;
    maxChildNodes?: number;
}

export interface ChunkedPassthroughOptions {
    chunkSize?: number;
}

export interface FlowedDecoderOptions extends LibmimeOptions {
    delSp?: boolean;
    encoding?: string | false;
}

export interface HeaderLine {
    key: string;
    line: string;
}

export interface DecodedHeader {
    key: string;
    value: string;
}

export interface MimeNode {
    type: 'node';
    root: boolean;
    parentNode: MimeNode | false;
    _boundary: Buffer | false;
    _parentBoundary: Buffer | false;
    _headerlen: number;
    multipart: string | false;
    encoding: string | false;
    headers: Headers | false;
    contentType: string | false;
    charset: string | false;
    disposition: string | false;
    filename: string | false;
    flowed: boolean;
    delSp: boolean;
    config: SplitterOptions;
    partNr: PartNumber | false;
    childPartNumbers: number;
    rfc822: boolean;
    messageNode?: boolean;

    getPartNr(provided?: PartNumberItem): PartNumber;
    addHeaderChunk(line?: Buffer | false): void;
    parseHeaders(): void;
    getHeaders(): Buffer;
    setContentType(contentType?: string | false): void;
    setCharset(charset?: string | false): void;
    setFilename(filename?: string | false): void;
    getDecoder(): Transform | PassThrough;
    getEncoder(encoding?: string | false): Transform | PassThrough;
}

export interface MessageChunk {
    node: MimeNode;
    type: 'data' | 'body';
    value: Buffer;
}

export interface EmptyChunk {
    type: 'none';
}

export type SplitterChunk = MimeNode | MessageChunk;
export type RewriterInput = SplitterChunk | EmptyChunk;
export type FilterFunc = (node: MimeNode) => boolean;
export type ErrorWithCode = Error & { code?: string };
export type ContinueCallback = () => void;
export type ContentStream = Transform | PassThrough;
export type DecoderStream = ContentStream & { $reading?: boolean };

export interface SplitterGroup {
    node?: MimeNode;
    type: 'none' | 'node' | 'data' | 'body';
    value?: Buffer;
}

export interface RewriterNode {
    node: MimeNode;
    decoder: Transform;
    encoder: Transform;
}

export interface StreamerNode {
    node: MimeNode;
    decoder: Transform;
    done: () => void;
}
