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

test('viewDetails handles missing params and renders markdown with special chars', () => {
  const resEmpty = createMockResponse();
  viewDetails({query: {}}, resEmpty);
  assert.equal(resEmpty.statusCode, 204);
  assert.equal(resEmpty.ended, true);

  const resMissingMsg = createMockResponse();
  viewDetails({query: {other: '123'}}, resMissingMsg);
  assert.equal(resMissingMsg.statusCode, 204);
  assert.equal(resMissingMsg.ended, true);

  const resWithPercent = createMockResponse();
  viewDetails({query: {msg: '### Title\n> perf: speed up by 25%\n* ✖ error [type-empty]'}}, resWithPercent);
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
