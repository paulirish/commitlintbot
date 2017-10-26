const axios = require('axios');

function api(data, repo, suffix) {
  const url = `https://api.github.com/repos/${repo}/${suffix}`;
  console.log('API: ', url);

  return axios({
    method: 'GET',
    url: url,
    responseType: 'json',
    headers: {Authorization: `token ${data.token}`}
  })
    .then(ret => ret.data)
    .catch(e => {
      const response = e.response || {status: 500};

      return Promise.reject({
        status: response.status,
        error: response.data
      });
    });
}

const getPRTitle = data => api(data, data.repo, `pulls/${data.pr}`);

const getFileContents = async (data, path) => {
  const payload = await api(data, data.srcRepo, `contents/${path}?ref=${data.sha}`);
  return Buffer.from(payload.content, 'base64').toString('utf8');
};

module.exports = {
  getPRTitle: getPRTitle,
  getFileContents: getFileContents
};
