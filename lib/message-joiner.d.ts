import { Transform } from 'node:stream';

declare class MessageJoiner extends Transform {
    constructor();
    on(event: 'data', listener: (data: Buffer) => void): this;
    once(event: 'data', listener: (data: Buffer) => void): this;
    addListener(event: 'data', listener: (data: Buffer) => void): this;
    prependListener(event: 'data', listener: (data: Buffer) => void): this;
    emit(event: 'data', data: Buffer): boolean;
}

export = MessageJoiner;
