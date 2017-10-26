const fs = require('fs');
const CommitStatus = require('github-build');

const Raven = require('raven');
Raven.config(
  'https://7b0de65a1e1f43a1bfc3ff0048b3a0eb:1491617418f048cdb1da1b9179575fbc@sentry.io/235838'
).install();

const requireFromString = require('require-from-string');
const lhClintConfig = require('./lighthouse.commitlint.config');
const {getPRTitle, getFileContents} = require('./github');

const lint = require('./lint');

const MAXIMUM_STATUS_LENGTH = 140;
const czConfigFilename = `.cz-config.js`;
const czConfigPath = `${__dirname}/${czConfigFilename}`;
const clintConfigFilename = 'commitlint.config.js';

const baseGithubData = {
  token: process.env.GHTOKEN, // (github oauth token: https://developer.github.com/v3/oauth)
  label: 'commitlint'
};

async function init(prData) {
  let status;
  try {
    const githubData = Object.assign({}, baseGithubData, prData);
    status = new CommitStatus(githubData);

    const lintOpts = {};

    const apiFetches = [
      getPRTitle(githubData),
      getFileContents(githubData, clintConfigFilename),
      getFileContents(githubData, czConfigFilename)
    ];
    const [title, clintConfigContent, czConfigContent] = await Promise.all(apiFetches);

    if (clintConfigContent) {
      lintOpts.clintConfig = requireFromString(clintConfigContent);
      // FIXME: remove this hack for backwards compatibility
    } else if (githubData.repo.includes('lighthouse')) {
      lintOpts.clintConfig = lhClintConfig;
    }

    // FIXME: can't write to disk on now.sh. will have to find a workaround.
    if (false && czConfigContent) {
      // unfortunately this file needs to be read off of disk
      fs.writeFileSync(czConfigPath, czConfigContent);
      lintOpts.cz = true;
    }

    const {report, reportObj} = await lint(title, lintOpts);

    // FIXME this too.
    if (false && fs.existsSync(czConfigPath)) fs.unlinkSync(czConfigPath);

    const flatReport = report.join('. ');

    // Set status to passing
    if (reportObj.valid === true) {
      console.log(`Setting ${githubData.repo} PR ${githubData.pr} to passing.`);
      return status
        .pass('PR title is good to go, boss', generateURL(title, report))
        .catch(handleCommitStatusFailure);
    }

    // Set status to failing
    console.log(`Setting ${githubData.repo} PR ${githubData.pr} to failing.`);
    console.log(flatReport);
    const failureMsg = flatReport.slice(0, MAXIMUM_STATUS_LENGTH);
    return status.fail(failureMsg, generateURL(title, report)).catch(handleCommitStatusFailure);
  } catch (e) {
    console.error('runtime failure', e);
    Raven.captureException(e);
    // Set status to error
    return status.error(e).catch(handleCommitStatusFailure);
  }

  function generateURL(prTitle, reportArr) {
    const titlePrefix = `Commit message:
> ${prTitle}

commitlint results:
`;
    const link = `

Expected PR title format is: {type}({optional-scope}): {subject}

See commitlint rules: https://github.com/marionebl/commitlint/blob/master/docs/reference-rules.md`;
    const preparedString = `${titlePrefix}${reportArr.join('&#010;')}`
      .replace(/✖/g, '&#x2716;')
      .replace(/✔/g, '&#x2714;')
      .replace(/⚠/g, '&#x26A0;');
    return `https://unhtml.appspot.com/escape?%3Cpre%3E${encodeURIComponent(
      preparedString
    )}%3C/pre%3E${encodeURIComponent(link)}`;
  }
}

function handleCommitStatusFailure(error) {
  console.warn('Failed to set commit status API via github-build', error);
}

module.exports = init;
