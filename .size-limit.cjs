module.exports = [
  {
    path: 'packages/**/dist/index.js',
    limit: '200 KB',
    esbuild: {
      bundle: true,
      platform: 'node',
      external: ['fs', 'path', 'os', 'child_process', 'stream', 'events'],
    },
  },
];
