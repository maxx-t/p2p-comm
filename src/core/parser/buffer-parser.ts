import { EventEmitter } from 'events';
import * as assert from 'assert';

import { Logger, SimpleLogger } from '../logger';
import { HandshakePacket, DataPacket, types } from './packets';
import { IHandshakePacket, IDataPacket } from './packets';

export type Packet = HandshakePacket | DataPacket;
export type IPacket = IHandshakePacket | IDataPacket;

const EMPTY = Buffer.alloc(0);

let safe = 20000;
let lock = false;

export class BufferParser extends EventEmitter /* implements Parser */ {

  logger: Logger;
  buf: Buffer;

  constructor() {
    super();
    this.buf = EMPTY;
    this.logger = new SimpleLogger('parser');
  }

  feed(data: Buffer): void {

    if (lock) {
      return;
    }

    lock = true;

    let buf = Buffer.concat([this.buf, data]);

    let packet: Packet = null;

    do {
      if (safe < 0) {
        return;
      }

      packet = this.decode(buf);

      safe--;

      // this.logger.log('decoded', safe, packet && packet.toJSON());

      if (!packet) {
        this.logger.warn('received invalid packet', buf);
        buf = EMPTY;
        break;
      }

      buf = buf.slice(packet.getTotalSize());

      this.emit('packet', packet);

      // if (!this.buf.length) {
      //   return;
      // }

    } while (buf.length);

    this.buf = Buffer.concat([buf]);
    lock = false;
  }

  decode(buf: Buffer): Packet {
    const offset = 0;
    let packet: Packet = null;

    // while (MIN_SIZE + offset < buf.length && Buffer.compare(MAGIC, buf.slice(offset, MAGIC.length + offset)) !== 0) {
    //   offset++;
    // }

    // offset += MAGIC.length;

    // if (buf.length < MIN_SIZE) {
    //   this.buf = buf.slice(offset);
    //   return;
    // }

    const type = buf[offset];

    // const raw = buf.slice(offset, stop + END.length);

    switch (type) {
      case types.DATA:
        packet = DataPacket.fromRaw(buf);
        break;
      case types.HANDSHAKE:
        packet = HandshakePacket.fromRaw(buf);
        break;
      case types.GETPEERS:
        packet = null;
        break;
    }

    if (!packet) {
      return;
    }

    return packet;
  }

  encode(packet: Packet): Buffer {
    // this.logger.debug('Encoding', packet.toJSON());
    return packet.toRaw();
  }

}