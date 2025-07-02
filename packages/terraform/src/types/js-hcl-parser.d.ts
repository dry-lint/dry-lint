declare module '@evops/hcl-terraform-parser' {
  export interface ParseResult {
    managed_resources?: Record<string, any>;
    variables?: Record<string, any>;
    outputs?: Record<string, any>;
    locals?: Record<string, any>;
    // add any other top-level blocks you need
  }

  /**
   * Parse Terraform HCL into a JSON-like model.
   * @param input the raw HCL text
   */
  export function parse(input: string): ParseResult;
}
