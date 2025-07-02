declare module '@apidevtools/swagger-parser' {
  export function dereference(root: string, api: any, options?: any): Promise<any>;

  export function bundle(root: string, api: any, options?: any): Promise<any>;

  export function validate(root: string, api?: any, options?: any): Promise<any>;
}
