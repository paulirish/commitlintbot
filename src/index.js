'use strict';

const Raven = require('raven');

Raven.config(
  'https://7b0de65a1e1f43a1bfc3ff0048b3a0eb:1491617418f048cdb1da1b9179575fbc@sentry.io/235838'
).install();

const CommitStatus = require('github-build');
const requireFromString = require('require-from-string');
const {getPRTitle, getFileContents} = require('./github');

const lint = require('./lint');

const MAXIMUM_STATUS_LENGTH = 140;
const czConfigFilename = `.cz-config.js`;
const clintConfigFilename = 'commitlint.config.js';

const baseGithubData = {
  token: process.env.ghtoken, // (github oauth token: https://developer.github.com/v3/oauth)
  label: 'pr title lint'
};

async function gatherGithubData(githubData) {
  const apiFetches = [
    getPRTitle(githubData),
    getFileContents(githubData, clintConfigFilename),
    getFileContents(githubData, czConfigFilename)
  ];
  let [title, clintConfigContent, czConfigContent] = await Promise.all(apiFetches);

  // requireFromString: js file string => object
  const clintConfig = clintConfigContent && requireFromString(clintConfigContent);
  const czConfig = requireFromString(czConfigContent);

  return {title, clintConfig, czConfig}
}

const defaultOpts = {reportStatus: true};

async function main(prData, cliRunData = false, opts = defaultOpts) {
  try {
    let status;
    const githubData = Object.assign({}, baseGithubData, prData);

    status = opts.reportStatus ? new CommitStatus(githubData) : new MockCommitStatus();
    await status.start('Linting the pull request title...').catch(handleCommitStatusFailure);

    // Allow CLI use for local testing :p
    const {title, clintConfig, czConfig} = await (!cliRunData ?
      gatherGithubData(githubData) :
      Promise.resolve(cliRunData));

    const {report, reportObj} = await lint(title, clintConfig, czConfig);


    opts.reportStatus && console.log('🌏 Reporting real status to GitHub: ', `https://api.github.com/repos/${prData.repo}/statuses/${prData.sha}`);

    // Set status to passing
    if (reportObj.valid === true) {
      console.log(`> 🖋✅ _Passing_ (https://github.com/${githubData.repo}/pull/${githubData.pr})`);
      return status
        .pass('PR title is good to go, boss', generateURL(title, report))
        .catch(handleCommitStatusFailure);
    }

    // Set status to failing
    console.log(`> 🖋❌ _Failing_ (https://github.com/${githubData.repo}/pull/${githubData.pr})`);

    const flatReport = report.join('.\n');
    console.log(flatReport);
    const failureMsg = flatReport.slice(0, MAXIMUM_STATUS_LENGTH);
    return status.fail(failureMsg, generateURL(title, report)).catch(handleCommitStatusFailure);
  } catch (err) {
    console.error('⚠️ Runtime failure', err);
    Raven.captureException(err);
    // Set status to error
    return status.error(err).catch(handleCommitStatusFailure);
  }

  function handleCommitStatusFailure({status, error}) {
    console.warn('Failed to set commit status API via github-build', status, error);
    return {status, data: {error}};
  }
}

module.exports = main;

function generateURL(prTitle, reportArr) {
  const outputStr = `
### Pull request title
> ${prTitle}

### Commitlint results

* ${reportArr.join('\n* ')}

Expected PR title format is: \`{type}({optional-scope}): {subject}\`

[Full docs of commitlint rules](https://github.com/marionebl/commitlint/blob/master/docs/reference-rules.md)
    `;

  return `https://commitlintbot.now.sh/details/?msg=${encodeURIComponent(outputStr)}`;
}

class MockCommitStatus {
  start (_) { return Promise.resolve(); }
  pass  (_) { return Promise.resolve(); }
  fail  (_) { return Promise.resolve(); }
  error (_) { return Promise.resolve(); }
}