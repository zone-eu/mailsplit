import { Transform } from 'node:stream';
import type { FilterFunc, RewriterNode, SplitterChunk } from './types';

declare class NodeRewriter extends Transform {
    constructor(filterFunc: FilterFunc, rewriteAction?: Function);
    on(event: 'data', listener: (data: SplitterChunk) => void): this;
    on(event: 'node', listener: (data: RewriterNode) => void): this;
    once(event: 'data', listener: (data: SplitterChunk) => void): this;
    once(event: 'node', listener: (data: RewriterNode) => void): this;
    addListener(event: 'data', listener: (data: SplitterChunk) => void): this;
    addListener(event: 'node', listener: (data: RewriterNode) => void): this;
    prependListener(event: 'data', listener: (data: SplitterChunk) => void): this;
    prependListener(event: 'node', listener: (data: RewriterNode) => void): this;
    emit(event: 'data', data: SplitterChunk): boolean;
    emit(event: 'node', data: RewriterNode): boolean;
}

export = NodeRewriter;
