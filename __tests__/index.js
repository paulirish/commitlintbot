'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const commitlintbot = require('../src/index');
const {indexPOST, indexGET} = require('../src/server');
const viewDetails = require('../src/view-details');
const {generateURL} = require('../src/view-details');

function createMockResponse() {
  const res = {
    statusCode: null,
    body: null,
    ended: false,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    }
  };
  return res;
}

test('commitlintbot main() works with cliRunData and MockCommitStatus', async () => {
  const prData = {
    repo: 'GoogleChrome/lighthouse',
    srcRepo: 'GoogleChrome/lighthouse',
    sha: '0000000000000000000000000000000000000000',
    pr: 1234,
  };

  const passingRun = await commitlintbot(
    prData,
    {title: 'feat: add great feature', clintConfig: null, czConfig: null},
    {reportStatus: false}
  );
  assert.equal(passingRun, undefined);

  const failingRun = await commitlintbot(
    prData,
    {title: 'invalid title', clintConfig: null, czConfig: null},
    {reportStatus: false}
  );
  assert.equal(failingRun, undefined);
});

test('viewDetails handles missing params and renders markdown with special chars', async () => {
  const resEmpty = createMockResponse();
  await viewDetails({query: {}}, resEmpty);
  assert.equal(resEmpty.statusCode, 204);
  assert.equal(resEmpty.ended, true);

  const resMissingMsg = createMockResponse();
  await viewDetails({query: {other: '123'}}, resMissingMsg);
  assert.equal(resMissingMsg.statusCode, 204);
  assert.equal(resMissingMsg.ended, true);

  const resWithPercent = createMockResponse();
  await viewDetails({query: {msg: '### Title\n> perf: speed up by 25%\n* ✖ error [type-empty]'}}, resWithPercent);
  assert.equal(resWithPercent.statusCode, 200);
  assert.ok(resWithPercent.body.includes('speed up by 25%'));
  assert.ok(resWithPercent.body.includes('❌'));

  const url = generateURL('feat: new feature', ['✖ error']);
  assert.ok(url.startsWith('https://commitlintbot2.vercel.app/api/details?msg='));
  assert.ok(url.includes(encodeURIComponent('feat: new feature')));
});

test('server indexGET returns version metadata', () => {
  const res = createMockResponse();
  indexGET({}, res);
  assert.ok(res.body);
  assert.ok(res.body.version);
});

test('server indexPOST validates headers and payloads cleanly', async () => {
  // Missing Content-Type
  const resNoType = createMockResponse();
  indexPOST({headers: {}, body: {}}, resNoType);
  assert.equal(resNoType.statusCode, 400);
  assert.equal(resNoType.body, 'Must set content type to `application/json`');

  // Missing x-github-event
  const resNoEvent = createMockResponse();
  indexPOST({headers: {'content-type': 'application/json'}, body: {}}, resNoEvent);
  assert.equal(resNoEvent.statusCode, 403);
  assert.equal(resNoEvent.body, 'Not a x-github-event POST');

  // Ping event
  const resPing = createMockResponse();
  indexPOST({headers: {'content-type': 'application/json', 'x-github-event': 'ping'}, body: {}}, resPing);
  assert.equal(resPing.statusCode, 200);
  assert.equal(resPing.body, 'pong');

  // Non-pull_request event
  const resIssue = createMockResponse();
  indexPOST({headers: {'content-type': 'application/json', 'x-github-event': 'issues'}, body: {}}, resIssue);
  assert.equal(resIssue.statusCode, 400);
  assert.equal(resIssue.body, 'Unexpected non-pull_request webhook');

  // Missing body / repository metadata
  const resEmptyBody = createMockResponse();
  indexPOST({headers: {'content-type': 'application/json', 'x-github-event': 'pull_request'}, body: {}}, resEmptyBody);
  assert.equal(resEmptyBody.statusCode, 400);
  assert.equal(resEmptyBody.body, 'Missing repository or pull_request metadata.');

  // Missing pull_request metadata
  const resNoPR = createMockResponse();
  indexPOST({
    headers: {'content-type': 'application/json', 'x-github-event': 'pull_request'},
    body: {repository: {full_name: 'test/repo'}}
  }, resNoPR);
  assert.equal(resNoPR.statusCode, 400);
  assert.equal(resNoPR.body, 'Missing repository or pull_request metadata.');
});

test('commitlintbot main() and CommitStatus lifecycle with mocked fetch', async () => {
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url, options = {}) => {
    calls.push({url, method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : null});

    if (url.includes('/pulls/100')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({title: 'feat: amazing new feature'})
      };
    }
    if (url.includes('/pulls/200')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({title: 'bad title'})
      };
    }
    if (url.includes('/pulls/300')) {
      return {
        ok: false,
        status: 404,
        json: async () => ({message: 'Not Found', documentation_url: 'https://docs.github.com'})
      };
    }
    if (url.includes('/contents/')) {
      return {
        ok: false,
        status: 404,
        json: async () => ({message: 'Not Found'})
      };
    }
    if (url.includes('/statuses/')) {
      return {
        ok: true,
        status: 201,
        json: async () => ({state: calls[calls.length - 1].body.state})
      };
    }
    return {ok: true, status: 200, json: async () => ({})};
  };

  try {
    // 1. Passing PR
    calls.length = 0;
    const resPass = await commitlintbot({
      repo: 'test/repo',
      srcRepo: 'test/repo',
      sha: 'abcdef1234567890abcdef1234567890abcdef12',
      pr: 100,
    });
    assert.equal(resPass.status, 201);
    const passStates = calls.filter(c => c.url.includes('/statuses/')).map(c => c.body.state);
    assert.deepEqual(passStates, ['pending', 'success']);

    // 2. Failing PR
    calls.length = 0;
    const resFail = await commitlintbot({
      repo: 'test/repo',
      srcRepo: 'test/repo',
      sha: 'abcdef1234567890abcdef1234567890abcdef12',
      pr: 200,
    });
    assert.equal(resFail.status, 201);
    const failStates = calls.filter(c => c.url.includes('/statuses/')).map(c => c.body.state);
    assert.deepEqual(failStates, ['pending', 'failure']);

    // 3. Error PR (404 on getPRTitle)
    calls.length = 0;
    const resErr = await commitlintbot({
      repo: 'test/repo',
      srcRepo: 'test/repo',
      sha: 'abcdef1234567890abcdef1234567890abcdef12',
      pr: 300,
    });
    assert.equal(resErr.status, 201);
    const errStates = calls.filter(c => c.url.includes('/statuses/')).map(c => c.body.state);
    assert.deepEqual(errStates, ['pending', 'error']);
  } finally {
    global.fetch = originalFetch;
  }
});

