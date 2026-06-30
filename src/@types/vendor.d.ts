declare module 'pdf-parse' {
  interface TextResult { text: string; pages: unknown[] }
  interface LoadParameters { data: Uint8Array | Buffer; [key: string]: unknown }
  export class PDFParse {
    constructor(options: LoadParameters);
    getText(params?: Record<string, unknown>): Promise<TextResult>;
    getInfo(params?: Record<string, unknown>): Promise<unknown>;
    destroy(): Promise<void>;
  }
}

declare module 'mammoth' {
  interface Result { value: string; messages: unknown[] }
  interface Options { buffer?: Buffer; path?: string; arrayBuffer?: ArrayBuffer; }
  function extractRawText(options: Options): Promise<Result>;
  function convertToHtml(options: Options): Promise<Result>;
  export { extractRawText, convertToHtml };
}
