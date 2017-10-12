module.exports = {
  extends: ['cz'],
  rules: {
    'body-leading-blank': [1, 'always'],
    'body-tense': [1, 'always', ['present-imperative']],
    'footer-leading-blank': [1, 'always'],
    'footer-tense': [1, 'always', ['present-imperative']],
    'header-max-length': [2, 'always', 80],
    lang: [0, 'always', 'eng'],
    'scope-case': [2, 'always', 'lowerCase'],
    'scope-empty': [0, 'never'],
    'subject-case': [1, 'always', 'lowerCase' ],
    'subject-empty': [0, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-tense': [1, 'always', ['present-imperative']],
    'type-case': [2, 'always', 'lowerCase'],
    'type-empty': [2, 'never'],
    // The scope-enum :  defined in the cz-config
    // The 'type-enum':  defined in the cz-config
  },
}
