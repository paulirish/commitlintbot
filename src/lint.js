'use strict';

const commitlint = require('@commitlint/core');
const mergeCZWithBaseConfig = require('commitlint-config-cz/lib/config').get;
const defaultClintConfig = require('./default-commitlint.config');

async function lint(prTitle, lintOpts = {}, czConfigContent) {
  console.log(`> Linting: ${prTitle}`);

  // Use provided commitlint.config or fallback to our local preset
  const baseConfig = lintOpts.clintConfig || defaultClintConfig;
  baseConfig.extends = baseConfig.extends || [];

  let mergedConfig;
  if (czConfigContent) {
    // Hack because of some weird expectation inside of commitlint-config-cz/lib/config').get;
    if (!baseConfig.rules['scope-enum']) baseConfig.rules['scope-enum'] = [0, 'never', 'bullshit'];
    if (!baseConfig.rules['type-enum']) baseConfig.rules['type-enum'] = [0, 'never', 'bullshit'];

    mergedConfig = mergeCZWithBaseConfig(czConfigContent, baseConfig);
  } else {
    mergedConfig = baseConfig;
  }

  const opts = await commitlint.load(mergedConfig);
  const reportObj = await commitlint.lint(prTitle, opts.rules);
  const report = await commitlint.format(reportObj, {color: false});
  return {reportObj, report};
}

module.exports = lint;

// Run via node lint.js "feat: awesome feature"
if (process.argv.length > 2) {
  (async function() {
    const {report} = await lint(process.argv[2]);
    process.stdout.write(report.join('\n') + '\n');
  })();
}
