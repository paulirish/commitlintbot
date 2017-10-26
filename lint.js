const commitlint = require('@commitlint/core');
const defaultClintConfig = require('./default-commitlint.config');

async function lint(prTitle, lintOpts = {}) {
  console.log(`Linting: ${prTitle}`);

  // use provided commitlint.config or fallback to our local preset
  const baseConfig = lintOpts.clintConfig || defaultClintConfig;
  baseConfig.extends = baseConfig.extends || [];
  // if we find a .cz-config then we'll extend to use it
  if (lintOpts.cz && !baseConfig.extends.includes('cz')) {
    baseConfig.extends.push('cz');
  }

  const opts = await commitlint.load(baseConfig);
  const reportObj = await commitlint.lint(prTitle, opts.rules);
  const report = await commitlint.format(reportObj, {color: false});
  return {reportObj, report};
}

module.exports = lint;

// run via node lint.js "feat: awesome feature"
if (process.argv.length > 2) {
  (async function() {
    const {report} = await lint(process.argv[2]);
    process.stdout.write(report.join('\n') + '\n');
  })();
}
