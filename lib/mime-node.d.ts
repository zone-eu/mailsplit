import type { ContentStream, MimeNode as MimeNodeShape, PartNumber, PartNumberItem, SplitterOptions } from './types';
import type Headers = require('./headers');

declare class MimeNode implements MimeNodeShape {
    type: 'node';
    root: boolean;
    parentNode: MimeNodeShape | false;
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

    constructor(parentNode?: MimeNodeShape | false, config?: SplitterOptions);
    getPartNr(provided?: PartNumberItem): PartNumber;
    addHeaderChunk(line?: Buffer | false): void;
    parseHeaders(): void;
    getHeaders(): Buffer;
    setContentType(contentType?: string | false): void;
    setCharset(charset?: string | false): void;
    setFilename(filename?: string | false): void;
    getDecoder(): ContentStream;
    getEncoder(encoding?: string | false): ContentStream;
}

export = MimeNode;
