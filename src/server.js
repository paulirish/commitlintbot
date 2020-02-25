'use strict';

const bodyParser = require('body-parser');
const server = require('express')();
const Queue = require('promise-queue');
const Raven = require('raven');

const {version} = require('../package.json');
const commitlintbot = require('./');
const viewDetails = require('./view-details');

const log = console;
const PORT = process.env.PORT || 3000;
const queue = new Queue(1, process.env.STAGE_CI_MAX_QUEUE || 100);

// github's webhook MUST use `application/json`
// server.use(bodyParser.json());

const indexGET = (request, response) => {
  response.json({version, queue});
};

const indexPOST = (request, response) => {
  let prData;
  try {
    const {headers, body} = request;

    const xGithubEvent = headers['x-github-event'];
    const contentType = headers['content-type'];

    if (contentType !== 'application/json')
      return response.status(400).send('Must set content type to `application/json`');
    if (!xGithubEvent) return response.status(403).send('Not a x-github-event POST');

    console.log('\n\n> Received webhook: ', body.repository.full_name, xGithubEvent);
    // 'ping' sent when a repo first registers the webhook
    if (xGithubEvent === 'ping') return response.sendStatus(200);
    if (xGithubEvent !== 'pull_request')
      return response.status(400).send('Unexpected non-pull_request webhook');

    if (!body.repository) {
      console.log('body', body);
      console.log('headers', headers);
      throw new Error('Missing repository metadata.');
    }

    // pull out required info
    prData = {
      repo: body.repository.full_name,
      srcRepo: body.pull_request.head.repo.full_name,
      sha: body.pull_request.head.sha,
      pr: body.number,
    };
  } catch (err) {
    console.error('⚠️ early server caught error', err);
    Raven.captureException(err);
    return response.status(500).send(err);
  }

  queue.add(async _ => {
    log.info(`> Calling commitlint bot with received webhook data`);
    try {
      const {status, data} = await commitlintbot(prData);
      // Some status API call failure
      if (data.error) {
        if (status === 404)
          return response
            .status(403)
            .send(
              'Organization permissions for commitlintbot not Allowed. See https://github.com/paulirish/commitlintbot#installation '
            );
        return response.status(403).send(data.error);
      }
      response.status(200).send('Successful commitlintbot run');
      console.log(`> Succcessful commitlint bot run. (GH Status API statuscode: ${status})`);
    } catch (err) {
      response.status(500).send(err);
      Raven.captureException(err);
      console.error('⚠️ server caught error', err, err.stack);
    }
    log.info('> Done!');
  });
};


module.exports = {
  indexGET,
  indexPOST,
  viewDetails,
}