'use strict';

async function ghRequest(method, url, token, body) {
  if (method === 'GET') console.log('>> GH API: ', url);
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        ...(body ? {'Content-Type': 'application/json'} : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    return Promise.reject({status: 500, error: err});
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return Promise.reject({status: res.status, error: data});
  }
  return {status: res.status, data};
}

const getPRTitle = async data => {
  const url = `https://api.github.com/repos/${data.repo}/pulls/${data.pr}`;
  const res = await ghRequest('GET', url, data.token).catch(err => {
    console.warn('getPRTitle', err.status);
    throw new Error(`Failed to fetch title from Github API: ${err.status} ${err.error && err.error.message} ${err.error && err.error.documentation_url}`);
  });
  return res.data && res.data.title;
};

const getFileContents = async (data, path) => {
  const url = `https://api.github.com/repos/${data.srcRepo}/contents/${path}?ref=${data.sha}`;
  const res = await ghRequest('GET', url, data.token).catch(err => {
    console.warn('getFileContents', err.status, path);
  });
  return res && res.data && res.data.content ? Buffer.from(res.data.content, 'base64').toString('utf8') : undefined;
};

class CommitStatus {
  constructor(meta) {
    this.meta = {
      ...meta,
      context: meta.label,
      target_url: meta.url,
    };
  }

  _update(state, message, url) {
    const postUrl = `https://api.github.com/repos/${this.meta.repo}/statuses/${this.meta.sha}`;
    return ghRequest('POST', postUrl, this.meta.token, {
      state,
      target_url: url || this.meta.target_url,
      description: message || this.meta.description,
      context: this.meta.context,
    });
  }

  start(message, url) { return this._update('pending', message, url); }
  pass(message, url)  { return this._update('success', message, url); }
  fail(message, url)  { return this._update('failure', message, url); }
  error(message, url) { return this._update('error', message, url); }
}

module.exports = {
  getPRTitle,
  getFileContents,
  CommitStatus,
};
