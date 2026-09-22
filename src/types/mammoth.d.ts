declare module "mammoth/mammoth.browser" {
  interface ConvertOptions {
    styleMap?: string[];
    includeDefaultStyleMap?: boolean;
  }
  interface ConvertResult {
    value: string;
    messages: { type: string; message: string }[];
  }
  interface Input {
    arrayBuffer?: ArrayBuffer;
    buffer?: Buffer;
    path?: string;
  }
  function convertToHtml(input: Input, options?: ConvertOptions): Promise<ConvertResult>;
  const mammoth: {
    convertToHtml: typeof convertToHtml;
  };
  export default mammoth;
}
