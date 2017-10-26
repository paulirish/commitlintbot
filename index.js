const fs = require('fs');
const CommitStatus = require('github-build');

const requireFromString = require('require-from-string');
const {getPRTitle, getFileContents} = require('./github');

const lint = require('./lint');

const MAXIMUM_STATUS_LENGTH = 140;
const czConfigFilename = `${__dirname}/.cz-config.js`;
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
    try {
      const czConfigContent = await getFileContents(githubData, czConfigFilename);
      fs.writeFileSync(`${czConfigFilename}`, czConfigContent);
      lintOpts.cz = true;
    } catch (e) {
      console.log('No custom .cz-config found. No prob.');
    }

    try {
      const clintConfigContent = await getFileContents(githubData, clintConfigFilename);
      lintOpts.clintConfig = requireFromString(clintConfigContent);
    } catch (e) {
      console.log('No custom commitlint.config.js found. No prob.');
    }

    const {title} = await getPRTitle(githubData);

    console.log(`Evaluating: ${title}`);
    const {report, reportObj} = await lint(title, lintOpts);

    if (fs.existsSync(`${czConfigFilename}`)) fs.unlinkSync(`${czConfigFilename}`);

    const flatReport = report.join('. ');

    // Set status to passing
    if (reportObj.valid === true) {
      console.log(`Setting ${githubData.repo} PR ${githubData.pr} to passing.`);
      return status.pass('PR title is good to go, boss', generateURL(title, report));
    }

    // Set status to failing
    console.log(`Setting ${githubData.repo} PR ${githubData.pr} to failing.`);
    console.log(flatReport);
    return status.fail(flatReport.slice(0, MAXIMUM_STATUS_LENGTH), generateURL(title, report));
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

module.exports = init;
