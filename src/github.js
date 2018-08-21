'use strict';

const axios = require('axios');

function api(data, repo, suffix) {
  const url = `https://api.github.com/repos/${repo}/${suffix}`;
  console.log('>> GH API: ', url);

  return axios({
    method: 'GET',
    url: url,
    responseType: 'json',
    headers: {Authorization: `token ${data.token}`}
  })
    .then(ret => ret.data)
    .catch(err => {
      const response = err.response || {status: 500};

      return Promise.reject({
        status: response.status,
        error: response.data || {}
      });
    });
}

const getPRTitle = async data => {
  const payload = await api(data, data.repo, `pulls/${data.pr}`).catch(err => {
    console.warn('getPRTItle', err.status);
    throw new Error(`Failed to fetch title from Github API: ${err.status} ${err.error.message} ${err.error.documentation_url}`);
  });
  return payload && payload.title;
};

const getFileContents = async (data, path) => {
  const payload = await api(data, data.srcRepo, `contents/${path}?ref=${data.sha}`).catch(err =>
    console.warn('getFileContents', err.status, path)
  );
  return payload ? Buffer.from(payload.content, 'base64').toString('utf8') : undefined;
};

module.exports = {
  getPRTitle,
  getFileContents,
};
