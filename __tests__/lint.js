'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const lint = require('../src/lint');
const {loadConfigFromString} = require('../src/index');

test('commitlint works with default config', async () => {
  assert.ok(typeof lint === 'function');

  const valid = await lint('fix: ok');
  assert.equal(valid.reportObj.valid, true);
  assert.deepEqual(valid.report, []);

  const noColon = await lint('no type or message because no colon');
  assert.equal(noColon.reportObj.valid, false);
  assert.equal(noColon.reportObj.errors.length, 2);
  assert.ok(noColon.report.some(line => line.includes('subject-empty')));
  assert.ok(noColon.report.some(line => line.includes('type-empty')));
  assert.ok(noColon.report.some(line => line.includes('found 2 problems, 0 warnings')));

  const badType = await lint('nondefaulttype: wont work');
  assert.equal(badType.reportObj.valid, false);
  assert.equal(badType.reportObj.errors.length, 1);
  assert.ok(badType.report.some(line => line.includes('type-enum')));
});

test('loadConfigFromString supports CJS, ESM, and edge cases', () => {
  assert.equal(loadConfigFromString(undefined), undefined);
  assert.equal(loadConfigFromString(''), undefined);

  const cjs = loadConfigFromString('module.exports = { rules: { "header-max-length": [2, "always", 72] } };');
  assert.deepEqual(cjs, { rules: { 'header-max-length': [2, 'always', 72] } });

  const esm = loadConfigFromString('export default { rules: { "header-max-length": [2, "always", 80] } };');
  assert.deepEqual(esm, { rules: { 'header-max-length': [2, 'always', 80] } });

  const transpiled = loadConfigFromString('module.exports = { __esModule: true, default: { rules: { "type-empty": [2, "never"] } } };');
  assert.deepEqual(transpiled, { rules: { 'type-empty': [2, 'never'] } });
});

test('commitlint works with custom clintConfig and czConfig (Lighthouse style)', async () => {
  const clintConfig = loadConfigFromString(`
    export default {
      extends: ['cz'],
      rules: {
        'header-max-length': [2, 'always', 80],
        'type-case': [2, 'always', 'lower-case'],
        'type-empty': [2, 'never'],
        'body-tense': [1, 'always', ['present-imperative']],
        'footer-tense': [1, 'always', ['present-imperative']],
        'lang': [0, 'always', 'eng'],
        'subject-tense': [1, 'always', ['present-imperative']],
      },
    };
  `);
  const czConfig = loadConfigFromString(`
    export default {
      allowBreakingChanges: ['core'],
      allowCustomScopes: true,
      scopes: [{name: 'viewer'}, {name: 'baseline'}],
      scopeOverrides: {
        misc: [{name: 'sentry'}, {name: 'viewer'}],
      },
      types: [
        {value: 'deps', name: 'deps: Dependency bumps only'},
        {value: 'core', name: 'core: Driver, gather, audits'},
        {value: 'misc', name: 'misc: Something else'},
      ],
    };
  `);

  const validDeps = await lint('deps: remove angular devDependency', clintConfig, czConfig);
  assert.equal(validDeps.reportObj.valid, true);

  const validScoped = await lint('core(baseline): update doc links', clintConfig, czConfig);
  assert.equal(validScoped.reportObj.valid, true);

  const validOverride = await lint('misc(sentry): add browser context', clintConfig, czConfig);
  assert.equal(validOverride.reportObj.valid, true);

  const invalidType = await lint('invalid: remove angular devDependency', clintConfig, czConfig);
  assert.equal(invalidType.reportObj.valid, false);

  const invalidScope = await lint('core(unknownscope): not allowed', clintConfig, czConfig);
  assert.equal(invalidScope.reportObj.valid, false);
});
