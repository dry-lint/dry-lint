export {};

declare global {
  interface ImportMeta {
    /** Bun / runtime shim: truthy when this file is executed directly */
    main?: ImportMeta;
  }
}
