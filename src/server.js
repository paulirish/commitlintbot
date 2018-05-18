const bodyParser = require('body-parser');
const server = require('express')();
const Queue = require('promise-queue');
const {version} = require('../package.json');
const commitlintbot = require('./');

const Raven = require('raven');
const viewDetails = require('./view-details');

const log = console;

const PORT = process.env.PORT || 3000;
const queue = new Queue(1, process.env.STAGE_CI_MAX_QUEUE || 100);

// github's webhook MUST use `application/json`
server.use(bodyParser.json());

server.get('/details/', viewDetails);

server.get('/', (request, response) => {
  response.json({version, queue});
});

server.post('/', async (request, response) => {
  let result;
  try {
    const {headers, body} = request;

    const xGithubEvent = headers['x-github-event'];
    const contentType = headers['content-type'];

    if (contentType !== 'application/json') return response.status(400).send('Must set content type to `application/json`');
    if (!xGithubEvent) return response.status(403).send('Not a x-github-event POST');

    console.log('\n\n> Received webhook: ', body.repository.full_name, xGithubEvent);
    // 'ping' sent when a repo first registers the webhook
    if (xGithubEvent === 'ping') return response.sendStatus(200);
    if (xGithubEvent !== 'pull_request') return response.status(400).send('Unexpected non-pull_request webhook');

    if (!body.repository) {
      console.log('body', body);
      console.log('headers', headers);
      throw new Error('Missing repository metadata.');
    }

    // pull out required info
    result = {
      repo: body.repository.full_name,
      srcRepo: body.pull_request.head.repo.full_name,
      sha: body.pull_request.head.sha,
      pr: body.number
    };
  } catch (error) {
    console.error('⚠️ early server caught error', error);
    Raven.captureException(error);
    return response.status(500).send(error);
  }

  queue.add(async () => {
    log.info(`> Calling commitlint bot with received webhook data`);
    try {
      const {status, data} = await commitlintbot(result);
      // Some status API call failure
      if (data.error) {
        if (status === 404) return response.status(403).send('Organization permissions for commitlintbot not Allowed. See https://github.com/paulirish/commitlintbot#installation ');
        return response.status(403).send(data.error);
      }
      response.status(200).send('Successful commitlintbot run');
      console.log(`> Succcessful commitlint bot run. (GH Status API statuscode: ${status})`);
    } catch (error) {
      response.status(500).send(error);
      Raven.captureException(error);
      console.error('⚠️ server caught error', error, error.stack);
    }
    log.info('> Done!');
  });
});

server.listen(PORT, () => {
  log.info(`Server listening on ${PORT}... `);
});
