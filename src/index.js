'use strict';

const Raven = require('raven');

Raven.config(
  'https://7b0de65a1e1f43a1bfc3ff0048b3a0eb:1491617418f048cdb1da1b9179575fbc@sentry.io/235838'
).install();

const Module = require('node:module');
const {getPRTitle, getFileContents, CommitStatus} = require('./github.js');
const {generateURL} = require('./view-details.js');

const lint = require('./lint');

const MAXIMUM_STATUS_LENGTH = 140;
const czConfigFilename = `.cz-config.js`;
const clintConfigFilename = 'commitlint.config.js';

const baseGithubData = {
  token: process.env.ghtoken, // (github oauth token: https://developer.github.com/v3/oauth)
  label: 'pr title lint'
};

function loadConfigFromString(content) {
  if (!content) return undefined;
  const cjsContent = content.replace(/^\s*export\s+default\b/m, 'module.exports =');
  const m = new Module('config.js');
  m.paths = Module._nodeModulePaths(process.cwd());
  m._compile(cjsContent, 'config.js');
  const mod = m.exports;
  return mod && mod.__esModule && mod.default ? mod.default : mod;
}

async function gatherGithubData(githubData) {
  const apiFetches = [
    getPRTitle(githubData),
    getFileContents(githubData, clintConfigFilename),
    getFileContents(githubData, czConfigFilename)
  ];
  let [title, clintConfigContent, czConfigContent] = await Promise.all(apiFetches);

  // requireFromString: js file string => object
  const clintConfig = loadConfigFromString(clintConfigContent);
  const czConfig = loadConfigFromString(czConfigContent);

  return {title, clintConfig, czConfig}
}

const defaultOpts = {reportStatus: true};

async function main(prData, cliRunData = false, opts = defaultOpts) {
  const githubData = Object.assign({}, baseGithubData, prData);
  const status = opts.reportStatus ? new CommitStatus(githubData) : new MockCommitStatus();
  try {
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
    const errorMsg = (err && err.message ? err.message : String(err)).slice(0, MAXIMUM_STATUS_LENGTH);
    return status.error(errorMsg).catch(handleCommitStatusFailure);
  }

  function handleCommitStatusFailure({status, error}) {
    console.warn('Failed to set commit status API via github-build', status, error);
    return {status, data: {error}};
  }
}

main.loadConfigFromString = loadConfigFromString;
module.exports = main;



class MockCommitStatus {
  start (_) { return Promise.resolve(); }
  pass  (_) { return Promise.resolve(); }
  fail  (_) { return Promise.resolve(); }
  error (_) { return Promise.resolve(); }
}