import { Transform } from 'node:stream';
import type { FlowedDecoderOptions } from './types';

declare class FlowedDecoder extends Transform {
    constructor(config?: FlowedDecoderOptions);
    on(event: 'data', listener: (data: Buffer) => void): this;
    once(event: 'data', listener: (data: Buffer) => void): this;
    addListener(event: 'data', listener: (data: Buffer) => void): this;
    prependListener(event: 'data', listener: (data: Buffer) => void): this;
    emit(event: 'data', data: Buffer): boolean;
}

export = FlowedDecoder;
