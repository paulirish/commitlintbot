'use strict';

const commitlint = require('@commitlint/core');
const mergeCZWithBaseConfig = require('commitlint-config-cz/lib/config').get;
const defaultClintConfig = require('./default-commitlint.config');

async function lint(prTitle, lintOpts = {}, czConfig) {
  console.log(`> Linting: ${prTitle}`);

  // Use provided commitlint.config or fallback to our local preset
  const baseConfig = lintOpts.clintConfig || defaultClintConfig;
  baseConfig.extends = baseConfig.extends || [];

  let mergedConfig;
  if (czConfig) {
    // Hack because clint has this CRAZY FUCKING module loader if it sees an .extends prop
    const index = baseConfig.extends.indexOf('cz');
    index > -1 && baseConfig.extends.splice(index, 1);

    // Hack because of some weird expectation inside of commitlint-config-cz/lib/config').get;
    if (czConfig.scopes.length && !baseConfig.rules['scope-enum']) {
      baseConfig.rules['scope-enum'] = [2, 'always'];
    }
    if (czConfig.types.length && !baseConfig.rules['type-enum']) {
      baseConfig.rules['type-enum'] = [2, 'always'];
    }

    mergedConfig = mergeCZWithBaseConfig(czConfig, baseConfig);
  } else {
    mergedConfig = baseConfig;
  }

  const opts = await commitlint.load(mergedConfig);
  const reportObj = await commitlint.lint(prTitle, opts.rules);
  let report = await commitlint.format.formatResult(reportObj, {color: false});
  // drop weird helpURL https://github.com/conventional-changelog/commitlint/blob/master/docs/reference-api.md#usage
  report = report.slice(0, report.length - 2);
  return {reportObj, report};
}

module.exports = lint;

// Run via
//         node lint.js "feat: awesome feature"
//         node lint.js "feat: awesome feature" --lh  # --lh has to be argv[3]..
//
if (process.argv.length > 2 && process.argv[1].includes('lint.js')) {
  (async function() {
    if (process.argv[3] == '--lh') {
      const {lintOpts, czConfig} =  getLHConfigPlaceholders();
      const {report} = await lint(process.argv[2], lintOpts, czConfig);
      process.stdout.write(report.join('\n') + '\n');
    } else {
      const {report} = await lint(process.argv[2],);
      process.stdout.write(report.join('\n') + '\n');
    }
  })();
}

function getLHConfigPlaceholders() {
  const lintOpts = {
    clintConfig: {
      extends: ['cz'],
      rules: {
        'body-leading-blank': [1, 'always'],
        // 'body-tense': [1, 'always', ['present-imperative']],
        'footer-leading-blank': [1, 'always'],
        // 'footer-tense': [1, 'always', ['present-imperative']],
        'header-max-length': [2, 'always', 80],
        // 'lang': [0, 'always', 'eng'],
        'scope-case': [2, 'always', 'lowerCase'],
        'scope-empty': [0, 'never'],
        'subject-case': [1, 'always', 'lowerCase'],
        'subject-empty': [0, 'never'],
        'subject-full-stop': [2, 'never', '.'],
        // 'subject-tense': [1, 'always', ['present-imperative']],
        'type-case': [2, 'always', 'lowerCase'],
        'type-empty': [2, 'never'],
        // The scope-enum :  defined in the cz-config
        // The 'type-enum':  defined in the cz-config
      },
    }
  };
  const czConfig = {
    allowBreakingChanges: ['core'],
    allowCustomScopes: true,
    scopes: [],
    types: [
      {value: 'new_audit',  name: 'new_audit: A new audit'},
      {value: 'core',       name: 'core:      Driver, gather, (non-new) audits, LHR JSON, etc'},
      {value: 'tests',      name: 'tests:     Tests, smokehouse, etc'},
      {value: 'i18n',       name: 'i18n:      Internationalization'},
      {value: 'docs',       name: 'docs:      Documentation'},
      {value: 'deps',       name: 'deps:      Dependency bumps only'},
      {value: 'report',     name: 'report:    Report, UI, renderers'},
      {value: 'cli',        name: 'cli:       CLI stuff'},
      {value: 'clients',    name: 'clients:   Extension, DevTools, or LR stuff'},
      {value: 'misc',       name: 'misc:      Something else entirely'}
    ]
  };
  return {lintOpts, czConfig};
}