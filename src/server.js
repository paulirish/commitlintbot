'use strict';

const Raven = require('raven');

const {version} = require('../package.json');
const commitlintbot = require('./');
const viewDetails = require('./view-details');

const log = console;

const indexGET = (request, response) => {
  response.json({version});
};

const indexPOST = async (request, response) => {
  let prData;
  try {
    const {headers, body} = request;

    const xGithubEvent = headers['x-github-event'];
    const contentType = headers['content-type'];

    if (contentType !== 'application/json')
      return response.status(400).send('Must set content type to `application/json`');
    if (!xGithubEvent) return response.status(403).send('Not a x-github-event POST');

    // 'ping' sent when a repo first registers the webhook
    if (xGithubEvent === 'ping') return response.status(200).send('pong');
    if (xGithubEvent !== 'pull_request')
      return response.status(400).send('Unexpected non-pull_request webhook');

    if (!body || !body.repository || !body.pull_request || !body.pull_request.head) {
      console.log('body', body);
      console.log('headers', headers);
      return response.status(400).send('Missing repository or pull_request metadata.');
    }

    console.log('\n\n> Received webhook: ', body.repository.full_name, xGithubEvent);

    // pull out required info
    prData = {
      repo: body.repository.full_name,
      srcRepo: body.pull_request.head.repo
        ? body.pull_request.head.repo.full_name
        : body.repository.full_name,
      sha: body.pull_request.head.sha,
      pr: body.number,
    };
  } catch (err) {
    console.error('⚠️ early server caught error', err);
    Raven.captureException(err);
    return response.status(500).send(err);
  }

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
};

module.exports = {
  indexGET,
  indexPOST,
  viewDetails,
};
