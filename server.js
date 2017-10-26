const bodyParser = require('body-parser');
const server = require('express')();
const Queue = require('promise-queue');
const {version} = require('./package.json');
const commitlintbot = require('./');

const log = console;

const PORT = process.env.PORT || 3000;
const queue = new Queue(1, process.env.STAGE_CI_MAX_QUEUE || 100);

// github's webhook MUST use `application/json`
server.use(bodyParser.json());

server.get('/', (request, response) => {
  response.json({version, queue});
});

server.post('/', async (request, response) => {
  let result;
  try {
    const {headers, body} = request;

    if (!body.repository) {
      console.log('body', body);
      throw new Error('Missing repository metadata.')
    }

    console.log('Received webhook: ', body.repository.full_name, headers['x-github-event']);

    // send when a repo first registers the webhook
    if (headers['x-github-event'] === 'ping') {
      return response.sendStatus(200);
    }
    if (headers['x-github-event'] !== 'pull_request') {
      console.error(body.repository.full_name, 'x-github-event', headers['x-github-event']);
      throw new Error(`Unexpected non-pull_request webhook`);
    }


    // pull out required info
    result = {
      repo: body.repository.full_name,
      srcRepo: body.pull_request.head.repo.full_name,
      sha: body.pull_request.head.sha,
      pr: body.number
    };
  } catch (error) {
    console.error('early server caught error', error);
    Raven.captureException(error);
    return response.status(500).send(error);
  }

  response.sendStatus(200);

  queue.add(async () => {
    log.info(`> Calling commitlint bot with received webhook data`);
    try {
      const {status, data} = await commitlintbot(result);
      console.log(`Setting Github build status API...: ${status}`);
    } catch (error) {
      Raven.captureException(error);
      console.error('server caught error', error, error.stack);
    }

    log.info('> Done!');
  });
});

server.listen(PORT, () => {
  log.info(`Server listening on ${PORT}... `);
});
