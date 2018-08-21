const fs = require('fs');
const CommitStatus = require('github-build');

const Raven = require('raven');
Raven.config(
  'https://7b0de65a1e1f43a1bfc3ff0048b3a0eb:1491617418f048cdb1da1b9179575fbc@sentry.io/235838'
).install();

const requireFromString = require('require-from-string');
const {getPRTitle, getFileContents} = require('./github');

const lint = require('./lint');

const MAXIMUM_STATUS_LENGTH = 140;
const czConfigFilename = `.cz-config.js`;
const czConfigPath = `${__dirname}/${czConfigFilename}`;
const clintConfigFilename = 'commitlint.config.js';

const baseGithubData = {
  token: process.env.GHTOKEN, // (github oauth token: https://developer.github.com/v3/oauth)
  label: 'pr title lint'
};

async function init(prData) {
  let status;
  try {
    const githubData = Object.assign({}, baseGithubData, prData);
    status = new CommitStatus(githubData);
    await status.start('Linting the pull request title...').catch(handleCommitStatusFailure);

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
      lintOpts.clintConfig = require('./lighthouse.commitlint.config'); // where even is this
    }

    // FIXME: can't write to disk on now.sh. will have to find a workaround.
    // https://github.com/paulirish/commitlintbot/issues/3
    if (false && czConfigContent) {
      // unfortunately this file needs to be read off of disk
      fs.writeFileSync(czConfigPath, czConfigContent);
      lintOpts.cz = true;
    }
    // FIXME: currently have to ignore extends:['cz'] in the config.
    if (!githubData.repo.includes('lighthouse') && lintOpts.clintConfig && lintOpts.clintConfig.extends) {
      lintOpts.clintConfig.extends = lintOpts.clintConfig.extends.filter(e => e !== 'cz');
    }

    const {report, reportObj} = await lint(title, lintOpts);

    // FIXME this too.
    if (false && fs.existsSync(czConfigPath)) fs.unlinkSync(czConfigPath);

    const flatReport = report.join('. ');

    // Set status to passing
    if (reportObj.valid === true) {
      console.log(`> 🖋✅ Setting status: _passing_ (https://github.com/${githubData.repo}/pull/${githubData.pr})`);
      return status
        .pass('PR title is good to go, boss', generateURL(title, report))
        .catch(handleCommitStatusFailure);
    }

    // Set status to failing
    console.log(`> 🖋❌ Setting status: _failing_ (https://github.com/${githubData.repo}/pull/${githubData.pr})`);
    console.log(flatReport);
    const failureMsg = flatReport.slice(0, MAXIMUM_STATUS_LENGTH);
    return status.fail(failureMsg, generateURL(title, report)).catch(handleCommitStatusFailure);
  } catch (e) {
    console.error('⚠️ Runtime failure', e);
    Raven.captureException(e);
    // Set status to error
    return status.error(e).catch(handleCommitStatusFailure);
  }

  function handleCommitStatusFailure({status, error}) {
    console.warn('Failed to set commit status API via github-build', status, error);
    return {status, data: {error}};
  }


}

module.exports = init;

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

