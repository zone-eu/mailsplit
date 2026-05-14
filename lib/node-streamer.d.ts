import { Transform } from 'node:stream';
import type { FilterFunc, SplitterChunk, StreamerNode } from './types';

declare class NodeStreamer extends Transform {
    constructor(filterFunc: FilterFunc, streamAction?: Function);
    on(event: 'data', listener: (data: SplitterChunk) => void): this;
    on(event: 'node', listener: (data: StreamerNode) => void): this;
    once(event: 'data', listener: (data: SplitterChunk) => void): this;
    once(event: 'node', listener: (data: StreamerNode) => void): this;
    addListener(event: 'data', listener: (data: SplitterChunk) => void): this;
    addListener(event: 'node', listener: (data: StreamerNode) => void): this;
    prependListener(event: 'data', listener: (data: SplitterChunk) => void): this;
    prependListener(event: 'node', listener: (data: StreamerNode) => void): this;
    emit(event: 'data', data: SplitterChunk): boolean;
    emit(event: 'node', data: StreamerNode): boolean;
}

export = NodeStreamer;
