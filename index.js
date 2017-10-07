const CommitStatus = require('github-build');

const commitlint = require('@commitlint/core');
const {getPRTitle} = require('./github');
const commitlintconfig = require('./commitlint.config.js');


const MAXIMUM_STATUS_LENGTH = 140;

const githubData = {
  repo: 'paulirish/lighthouse', // (author/repo)
  sha: 'ade63cf62b1c54cf6dc070a6c5db876e90bffa98', // (commit sha)
  pr: 7, // (pull request #)
  token: process.env.GHTOKEN, // (github oauth token: https://developer.github.com/v3/oauth)
  label: 'commitlint',
};

const status = new CommitStatus(githubData);

async function init() {
  try {
    const {statusCode, data} = await getPRTitle(githubData);

    const prTitle = data.title;

    // Lint the title
    const opts = await commitlint.load({
      extends: ['./commitlint.config.js']
    });

    console.log(opts.rules);

    const reportObj = await commitlint.lint(prTitle, opts.rules);
    console.log(reportObj);
    const report = await commitlint.format(reportObj, {color: false});

    const flatReport = report.join('. ').slice(0, MAXIMUM_STATUS_LENGTH);
    // Set status to passing
    if (flatReport.includes('found 0 problems')) return status.pass('PR title is good to go, boss', generateURL(prTitle, report));
    // Set status to failing
    return status.fail(flatReport, generateURL(prTitle, report));
  } catch (e) {
    console.error(e);
    // Set status to error
    status.error(e);
  }

  function generateURL(prTitle, reportArr) {
    const titlePrefix = `Commit message:
> ${prTitle}

commitlint results:
`;
const link = `

See commitlint rules: https://github.com/marionebl/commitlint/blob/master/docs/reference-rules.md`;
    const preparedString = `${titlePrefix}${reportArr.join('&#010;')}`
      .replace(/✖/g, '&#x2716;')
      .replace(/✔/g, '&#x2714;')
      .replace(/⚠/g, '&#x26A0;');
    return `http://unhtml.appspot.com/escape?%3Cpre%3E${encodeURIComponent(preparedString)}%3C/pre%3E${encodeURIComponent(link)}`;
  }
}

module.exports = init;
