const commitlintbot = require('./');

/*
  Running

  env (cat .env) node src/cli.js "feat: awesome feature"
  gls src/* | entr env (cat .env) node src/cli.js "feat: awesome feature"

  options:
    --report reports to github status check
*/

(async function() {
  const commitmsg = process.argv[2];

  const {clintConfig, czConfig} = getLHConfigPlaceholders();

  const cliRunData = {
    title: commitmsg,
    clintConfig,
    czConfig,
  };
  const prData = {
    repo: 'GoogleChrome/lighthouse',
    srcRepo: 'GoogleChrome/lighthouse',
    sha: 'dba63a60d774d9f6fa1ef0974495bec96af2235c',
    pr: '10361',
  };
  const opts = {
    reportStatus: process.argv.includes('--report'),
  };

  await commitlintbot(prData, cliRunData, opts);
})();

function getLHConfigPlaceholders() {
  const clintConfig = {
    extends: ['cz'],
    rules: {
      'body-leading-blank': [1, 'always'],
      'body-tense': [1, 'always', ['present-imperative']],
      'footer-leading-blank': [1, 'always'],
      'footer-tense': [1, 'always', ['present-imperative']],
      'header-max-length': [2, 'always', 80],
      // 'lang': [0, 'always', 'eng'],
      'scope-case': [2, 'always', 'lowerCase'],
      'scope-empty': [0, 'never'],
      'subject-case': [1, 'always', 'lowerCase'],
      'subject-empty': [0, 'never'],
      'subject-full-stop': [2, 'never', '.'],
      // 'subject-tense': [1, 'always', ['present-imperative']],
      'type-case': [2, 'always', 'lowerCase'],
      'type-empty': [2, 'never'],
      // The scope-enum :  defined in the cz-config
      // The 'type-enum':  defined in the cz-config
    },
  };
  const czConfig = {
    allowBreakingChanges: ['core'],
    allowCustomScopes: true,
    scopes: [],
    types: [
      {value: 'new_audit', name: 'new_audit: A new audit'},
      {value: 'core', name: 'core:      Driver, gather, (non-new) audits, LHR JSON, etc'},
      {value: 'tests', name: 'tests:     Tests, smokehouse, etc'},
      {value: 'i18n', name: 'i18n:      Internationalization'},
      {value: 'docs', name: 'docs:      Documentation'},
      {value: 'deps', name: 'deps:      Dependency bumps only'},
      {value: 'report', name: 'report:    Report, UI, renderers'},
      {value: 'cli', name: 'cli:       CLI stuff'},
      {value: 'clients', name: 'clients:   Extension, DevTools, or LR stuff'},
      {value: 'misc', name: 'misc:      Something else entirely'},
    ],
  };
  return {clintConfig, czConfig};
}
