'use strict';

const marked = require('marked');

module.exports = (request, response) => {
  const {query} = request;
  if (Object.keys(query).length === 0 || !query.msg) return response.status(204);

  const markdown = decodeURIComponent(query.msg)
    .replace(/✖/g, '❌')
    .replace(/✔/g, '✅')
    .replace(/⚠/g, '⚠️');

  const html = marked(markdown);
  console.log(html);
  return response.status(200).send(`${getPageTemplate()} ${html}`);
};

function getPageTemplate() {
  return `
    <doctype html>
    <title>PR Lint Details</title>
    <link rel="shortcut icon" href="https://avatars2.githubusercontent.com/oa/599844?s=40&u=d7a1abdf865c5bd35d536a72281c383f4fa7fce5&v=4">
    <style>
    html {
      padding: 40px;
      background: #ececec;
      font-family: sans-serif;
    }

    * {
      border-radius: 5px;
    }

    article {
      background: white;
      padding: 20px;
      min-width: 380px;
    }

    blockquote {
      background: #fbfbfb;
      border: 1px solid #bdbdbd;
      padding: 2px 12px;
      /* copied from github's css */
      font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol";
      margin: 8px 19px;
      font-weight: 400;
      line-height: 0.625;
      font-size: 32px;
    }
    code { font-size: 70%; }
    h3 {
      color: #283593;
    }
    </style>
    <body>
    <article>
  `;
}

function generateURL(prTitle, reportArr) {
  const outputStr = `
### Pull request title
> ${prTitle}

### Expected format
> \`\${type}(\${optional-scope}): \${subject}\`

### Commitlint results

* ${reportArr.join('\n* ')}

[Full docs of commitlint rules](https://github.com/marionebl/commitlint/blob/master/docs/reference-rules.md)
`;

  return `https://commitlintbot2.now.sh/api/details?msg=${encodeURIComponent(outputStr)}`;
}
module.exports.generateURL = generateURL;