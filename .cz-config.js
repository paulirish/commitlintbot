'use strict'

module.exports = {
  allowBreakingChanges: ['core'],
  allowCustomScopes: true,
  scopes: [],
  types: [
    {value: 'new-audit', name: 'new-audit: A new audit'},
    {
      value: 'core',
      name: 'core:      Driver, gather, (non-new) audits, LHR JSON, etc',
    },
    {value: 'tests', name: 'tests:     Tests, smokehouse, etc'},
    {value: 'docs', name: 'docs:      Documentation'},
    {value: 'deps', name: 'deps:      Dependency bumps only'},
    {value: 'report', name: 'report:    Report, UI, renderers'},
    {value: 'cli', name: 'cli:       CLI stuff'},
    {value: 'extension', name: 'extension: Chrome extension stuff'},
    {value: 'misc', name: 'misc:      Something else entirely'},
  ],
}
