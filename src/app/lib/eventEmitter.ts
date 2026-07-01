import { EventEmitter } from 'events';

const globalForEmitter = global as unknown as { eventEmitter: EventEmitter };

export const eventEmitter = globalForEmitter.eventEmitter || new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
    globalForEmitter.eventEmitter = eventEmitter;
}
