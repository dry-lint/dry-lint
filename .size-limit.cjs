module.exports = [
  {
    name: 'CLI',
    path: 'packages/cli/dist/index.js',
    limit: '500 KB',
    bundle: true,
    platform: 'node',
    external: ['fs', 'path', 'os', 'child_process', 'stream', 'events'],
  },
];
