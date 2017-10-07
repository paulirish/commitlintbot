const path = require('path');
const bodyParser = require('body-parser');
const server = require('express')();
const Queue = require('promise-queue');
const {version} = require('./package.json');
const commitlintbot = require('./');

const log = console;

const PORT = process.env.PORT || 3000;
const DEPLOY_DIR = path.resolve('/tmp/.stage-ci');
const queue = new Queue(1, process.env.STAGE_CI_MAX_QUEUE || 100);

server.use(bodyParser.json());

server.get('/', (request, response) => {
  response.json({version, queue});
});

server.post('/', async (request, response) => {
  let result;
  // try {
  //   const {headers, body} = request;
  //   const keys = Object.keys(headers);
  //   // if (keys.includes('x-github-event')) result = github({headers, body});
  //   // if (keys.includes('x-gitlab-event')) result = gitlab({headers, body});
  // } catch (error) {
  //   if (error.asJson && error.asJson.error && error.asJson.error.type === 'fatal') {
  //     response.status(500).send(error.asJson);
  //     return;
  //   }
  // }

  // const {success, ref, sha, name, alias, cloneUrl, setStatus, deploy} = result;
  const success = true;
  response.sendStatus((success) ? 200 : 204);
  if (!success) return;

  queue.add(async () => {
    log.info(`> Trying`);
    // const localDirectory = path.join(DEPLOY_DIR, name);

    try {
      await commitlintbot();
    } catch (error) {
      console.error(error.stack);
      if (error.response) {
        console.error(error.response.data.message);
        console.error(error.response.data.errors);
        console.error(error.response.data.documentation_url);
      }
    }

    log.info('> Done!');
  });
});

server.listen(PORT, () => {
  log.info(`Server listening on ${PORT}... `);
});
