declare module '@babel/traverse' {
  import traverse = require('@babel/traverse');
  export = traverse; // keep existing export=
  export default typeof traverse;
}
