const commitlint = require('@commitlint/core');

async function lint(prTitle) {
  const opts = await commitlint.load({
    extends: ['./commitlint.config.js']
  });

  const reportObj = await commitlint.lint(prTitle, opts.rules);
  const report = await commitlint.format(reportObj, {color: false});
  return {reportObj, report};
}

module.exports = lint;

if (process.argv.length > 2) {
  (async function() {
    const {report} = await lint(process.argv[2]);
    process.stdout.write(report.join('\n') + '\n');
  })();
}
