const commitlintbot = require('../');

test.skip('commitlint should not throw', async () => {
  const prData = {
    "repo": "paulirish/hello-world",
    "srcRepo": "paulirish/hello-world",
    "sha": "0b1071e273a63bdaa3b477aeafbb585247de3cbb",
    "pr": 7
  };

  expect(commitlintbot).toBeDefined();

  const fullRun = await commitlintbot(prData);
  expect(fullRun).toBeUndefined();
})
