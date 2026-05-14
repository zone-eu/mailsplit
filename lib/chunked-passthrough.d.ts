import { Transform } from 'node:stream';
import type { ChunkedPassthroughOptions } from './types';

declare class ChunkedPassthrough extends Transform {
    constructor(options?: ChunkedPassthroughOptions);
    on(event: 'data', listener: (data: Buffer) => void): this;
    once(event: 'data', listener: (data: Buffer) => void): this;
    addListener(event: 'data', listener: (data: Buffer) => void): this;
    prependListener(event: 'data', listener: (data: Buffer) => void): this;
    emit(event: 'data', data: Buffer): boolean;
}

export = ChunkedPassthrough;
