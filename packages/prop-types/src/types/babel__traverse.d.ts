declare module '@babel/traverse' {
  import traverse = require('@babel/traverse');
  export = traverse;
  export default typeof traverse;
}
