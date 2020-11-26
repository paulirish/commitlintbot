'use strict';

const commitlint = require('@commitlint/core');
const mergeCZWithBaseConfig = require('commitlint-config-cz/lib/config').get;
const defaultClintConfig = require('./default-commitlint.config');

async function lint(prTitle, clintConfig = {}, czConfig) {
  console.log(`> Linting: ${prTitle}`);

  // Use provided commitlint.config or fallback to our local preset
  const baseConfig = clintConfig || defaultClintConfig;
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

  // HACK remove deprecated rules. Can be removed after existing PRs
  for (const deprecatedRule of ['body-tense', 'footer-tense', 'lang', 'subject-tense']) {
    delete mergedConfig.rules[deprecatedRule];
  }

  const opts = await commitlint.load(mergedConfig);
  try {
    const reportObj = await commitlint.lint(prTitle, opts.rules);
    let report = await commitlint.format.formatResult(reportObj, {color: false});
    // drop weird helpURL https://github.com/conventional-changelog/commitlint/blob/master/docs/reference-api.md#usage
    report = report.slice(0, report.length - 2);
    return {reportObj, report};
  } catch (e) {
    return {
      reportObj: {
        valid: false,
        errors: [e.message],
        warnings: [],
      },
      report: [e.message]
    }
  }
}

module.exports = lint;