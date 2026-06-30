declare module '@whiskeysockets/baileys' {
  export type WAMessage = any;
  export type WAMessageKey = any;
  export type WASocket = any;
  export type AnyMessageContent = any;
  export type MiscMessageGenerationOptions = any;
  export type GroupMetadata = any;
  export type Chat = any;
  export type Contact = any;
  export type WAConnectionState = any;
  export type BaileysEventMap = any;
  export type WAProto = any;
  export type AuthenticationState = any;
  export type SignalDataTypeMap = any;
  export type WABrowserDescription = any;

  export const BufferJSON: any;
  export const proto: any;
  export const Browsers: any;
  export const DisconnectReason: any;

  export function useMultiFileAuthState(folder: string): Promise<any>;
  export function fetchLatestBaileysVersion(options?: any): Promise<any>;
  export function makeWASocket(config: any): any;
  export function downloadMediaMessage(...args: any[]): Promise<any>;
  export function normalizeMessageContent(content: any): any;
  export function getContentType(content: any): any;
  export function jidNormalizedUser(jid: any): any;
  export function jidDecode(jid: any): any;
  export function isJidGroup(jid: any): any;
  export function isJidUser(jid: any): any;
  export function areJidsSameUser(j1: any, j2: any): any;
  export function generateWAMessageFromContent(...args: any[]): any;
  export function prepareWAMessageMedia(...args: any[]): any;

  const _default: typeof makeWASocket;
  export default _default;
}

declare module '@whiskeysockets/baileys/lib/Utils/logger.js' {
  export interface ILogger {
    level: string | number;
    child(bindings: Record<string, unknown>): ILogger;
    trace(msg: string, ...args: any[]): void;
    trace(obj: object, msg?: string, ...args: any[]): void;
    debug(msg: string, ...args: any[]): void;
    debug(obj: object, msg?: string, ...args: any[]): void;
    info(msg: string, ...args: any[]): void;
    info(obj: object, msg?: string, ...args: any[]): void;
    warn(msg: string, ...args: any[]): void;
    warn(obj: object, msg?: string, ...args: any[]): void;
    error(msg: string, ...args: any[]): void;
    error(obj: object, msg?: string, ...args: any[]): void;
    fatal(msg: string, ...args: any[]): void;
    fatal(obj: object, msg?: string, ...args: any[]): void;
  }
}
