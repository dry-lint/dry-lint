import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// utility
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'asyncapi-'));
const file = (dir: string, name: string, contents: string) =>
  fs.writeFileSync(path.join(dir, name), contents);

// lazy-load extractor after any mocks
const load = async () => {
  await import('./index.js');
  const { findDuplicates } = await import('@dry-lint/core');
  return findDuplicates;
};

describe('AsyncAPI extractor', () => {
  const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const yamlDoc = `
asyncapi: '2.0.0'
info: { title: t, version: '1.0.0' }
channels:
  user/signedup:
    publish:
      message:
        name: UserSignedUp
        payload: { type: object }
  user/login:
    subscribe:
      message:
        $ref: '#/components/messages/Login'`;
  const jsonDoc = JSON.stringify({
    asyncapi: '2.0.0',
    channels: {
      'json/created': {
        publish: { message: { name: 'JsonCreated', payload: {} } },
      },
    },
  });

  it('extracts YAML messages (no duplicates)', async () => {
    const dir = tmp();
    file(dir, 'api.yaml', yamlDoc);

    const groups = await (
      await load()
    )([path.join(dir, 'api.yaml')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0);
  });

  it('extracts JSON messages', async () => {
    const dir = tmp();
    file(dir, 'api.json', jsonDoc);

    const groups = await (
      await load()
    )([path.join(dir, 'api.json')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0);
  });

  it('detects duplicate messages across files', async () => {
    const dir = tmp();
    file(dir, 'a.yaml', yamlDoc);
    file(dir, 'b.yaml', yamlDoc);

    const groups = await (
      await load()
    )([path.join(dir, 'a.yaml'), path.join(dir, 'b.yaml')], { threshold: 1, json: true });

    // expect one duplicate group per message type
    expect(groups).toHaveLength(2);
    for (const group of groups) {
      expect(group.similarity).toBe(1);
      const names = group.decls.map(d => d.location.name).sort();
      expect(names).toEqual([names[0], names[0]]); // both decls share the same name
    }

    const sortedNames = groups.map(g => g.decls[0]!.location.name).sort();
    expect(sortedNames).toEqual(['user/login.Login', 'user/signedup.UserSignedUp']);
  });

  it('ignores documents where channels is not an object', async () => {
    const bad = `
asyncapi: '2.0.0'
channels: []`;
    const dir = tmp();
    file(dir, 'bad.yaml', bad);

    const groups = await (
      await load()
    )([path.join(dir, 'bad.yaml')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0);
  });

  it('handles YAML parse errors gracefully', async () => {
    vi.doMock('yaml', () => ({
      parse: () => {
        throw new Error('boom');
      },
    }));
    const dir = tmp();
    file(dir, 'err.yaml', ':');

    const groups = await (
      await load()
    )([path.join(dir, 'err.yaml')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0);
    expect(errSpy).toHaveBeenCalled();
  });

  it('treats distinct messages below threshold as unique', async () => {
    const dir = tmp();
    file(
      dir,
      'a.yaml',
      `
asyncapi: '2.0.0'
channels:
  a:
    publish: { message: { name: A, payload: {} } }`
    );
    file(
      dir,
      'b.yaml',
      `
asyncapi: '2.0.0'
channels:
  b:
    publish: { message: { name: B, payload: {} } }`
    );

    const groups = await (
      await load()
    )([path.join(dir, 'a.yaml'), path.join(dir, 'b.yaml')], { threshold: 0.9, json: true });
    expect(groups).toHaveLength(0);
  });
});
