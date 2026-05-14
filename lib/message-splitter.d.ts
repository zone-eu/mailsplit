import { Transform } from 'node:stream';
import type { SplitterChunk, SplitterOptions } from './types';

declare class MessageSplitter extends Transform {
    constructor(config?: SplitterOptions);
    on(event: 'data', listener: (data: SplitterChunk) => void): this;
    once(event: 'data', listener: (data: SplitterChunk) => void): this;
    addListener(event: 'data', listener: (data: SplitterChunk) => void): this;
    prependListener(event: 'data', listener: (data: SplitterChunk) => void): this;
    emit(event: 'data', data: SplitterChunk): boolean;
}

export = MessageSplitter;
