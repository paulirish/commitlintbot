'use strict';

const defaultClintConfig = require('./default-commitlint.config');

let _commitlintLint;
async function getCommitlintLint() {
  if (!_commitlintLint) {
    try {
      const mod = await import('@commitlint/lint');
      _commitlintLint = mod.default || mod;
    } catch {
      _commitlintLint = require('@commitlint/lint');
    }
  }
  return _commitlintLint;
}

function mergeCZWithBaseConfig(czConfig, baseConfig) {
  const config = structuredClone(baseConfig);
  config.rules = config.rules || {};

  if (Array.isArray(config.extends)) {
    const idx = config.extends.indexOf('cz');
    if (idx > -1) config.extends.splice(idx, 1);
  }

  if (czConfig) {
    if (czConfig.types) {
      const types = czConfig.types.map(t => (typeof t === 'string' ? t : t.value));
      if (types.length) {
        config.rules['type-enum'] = [2, 'always', types];
      } else {
        delete config.rules['type-enum'];
      }
    }

    if (czConfig.scopes || czConfig.scopeOverrides) {
      const scopes = [];
      if (czConfig.scopes) {
        for (const s of czConfig.scopes) {
          scopes.push(typeof s === 'string' ? s : s.name);
        }
      }
      if (czConfig.scopeOverrides) {
        for (const type of Object.keys(czConfig.scopeOverrides)) {
          for (const s of czConfig.scopeOverrides[type]) {
            scopes.push(typeof s === 'string' ? s : s.name);
          }
        }
      }
      const uniqueScopes = Array.from(new Set(scopes));
      if (uniqueScopes.length) {
        config.rules['scope-enum'] = [2, 'always', uniqueScopes];
      } else {
        delete config.rules['scope-enum'];
      }
    }
  }

  return config;
}

function formatReport(reportObj) {
  const {errors = [], warnings = []} = reportObj;
  const problems = [...errors, ...warnings].map(p => {
    const sign = p.level === 2 ? '✖' : p.level === 1 ? '⚠' : ' ';
    return `${sign}   ${p.message} [${p.name}]`;
  });
  if (!problems.length) return [];
  const sign = errors.length > 0 ? '✖' : warnings.length > 0 ? '⚠' : '✔';
  return [...problems, '', `${sign}   found ${errors.length} problems, ${warnings.length} warnings`];
}

async function lint(prTitle, clintConfig, czConfig) {
  console.log(`> Linting: ${prTitle}`);

  const baseConfig = clintConfig || defaultClintConfig;
  const mergedConfig = mergeCZWithBaseConfig(czConfig, baseConfig);

  // Remove deprecated rules
  if (mergedConfig.rules) {
    for (const deprecatedRule of ['body-tense', 'footer-tense', 'lang', 'subject-tense']) {
      delete mergedConfig.rules[deprecatedRule];
    }
  }

  try {
    const commitlintLint = await getCommitlintLint();
    const reportObj = await commitlintLint(prTitle, mergedConfig.rules);
    const report = formatReport(reportObj);
    return {reportObj, report};
  } catch (e) {
    return {
      reportObj: {
        valid: false,
        errors: [e.message],
        warnings: [],
      },
      report: [e.message]
    };
  }
}

lint.mergeCZWithBaseConfig = mergeCZWithBaseConfig;
lint.formatReport = formatReport;
module.exports = lint;

if (require.main === module) {
  const prTitle = process.argv[2] || 'feat: awesome feature';
  lint(prTitle).then(({reportObj, report}) => {
    console.log(reportObj.valid ? '✅ Valid' : '❌ Invalid');
    if (report.length) console.log(report.join('\n'));
  });
}
