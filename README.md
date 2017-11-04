<div align="center">
<h1>commitlintbot</h1>

<p>Runs commitlint against your projects PRs</p>
</div>

<hr />

[![Build Status][build-badge]][build]
[![Code Coverage][coverage-badge]][coverage]
[![version][version-badge]][package]
[![downloads][downloads-badge]][npmtrends]
[![MIT License][license-badge]][LICENSE]

[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors)
[![PRs Welcome][prs-badge]][prs]
[![Code of Conduct][coc-badge]][coc]

[![Watch on GitHub][github-watch-badge]][github-watch]
[![Star on GitHub][github-star-badge]][github-star]
[![Tweet][twitter-badge]][twitter]

<img width="528" align="right" alt="screen shot 2017-10-07 at 4 50 48 pm" src="https://user-images.githubusercontent.com/39191/31313114-5967e096-ab8d-11e7-98b5-6bae28da0a94.png">


## The problem

You use [conventional-changelog](http://conventionalcommits.org/), but you squash pull requests (PRs). So you want PR titles to match the same semantics as your conventional changelog requirements. _(If you want a bot to lint against your commit messages instead of the PR title, then check out [ahmed-taj/commitlint-bot](https://github.com/ahmed-taj/commitlint-bot)!)_

## This solution

commitlintbot is a bot that will update your pull request's commit status based on your PR's title satisfying the requirements of your conventional-changelog configuration.  It runs on now.sh, and receives github webhooks and updates a commit status via the Github API.


![image](https://user-images.githubusercontent.com/39191/31453450-16c1c202-ae67-11e7-8b9f-5d7b1d553b2b.png)
![image](https://user-images.githubusercontent.com/39191/31453417-f6da45ae-ae66-11e7-9727-24c69d2fc03b.png)


## Configuration
* A [default commitlint config](./default-commitlint.config.js) will be applied.
   * However if you have a `commitlint.config.js` in the root of the repo, that will be used instead. The other config formats (.commitlintrc.js, .commitlintrc.json, .commitlintrc.yml) are **not** supported.
* ~Additionally, if you have a `.cz-config.js` in the root of your repo, that will be used to enforce your custom scopes & types.~ This is [broken](https://github.com/whizark/commitlint-config-cz/issues/2) ATM. <3


## Installation

* Setup webhook.
  * `https://commitlintbot.now.sh`
  * `application/json`
  * Secret... not implemented. :|
  * Choose individual events: `Pull request`
  * Add.
* If you want to use this in an organization and the org has fairly locked down permissions, org owners will need to approve the use of the app (via OAuth client_id): https://github.com/settings/connections/applications/e3737bbd21bc66fb0a18

Now, things should be pretty automatic.

## Also

* If you want to run your own.. just deploy to `now` with `now -e GHTOKEN=yourgithubpersonalaccesstoken`.




## LICENSE

MIT

[npm]: https://www.npmjs.com/
[node]: https://nodejs.org
[build-badge]: https://img.shields.io/travis/paulirish/commitlintbot.svg?style=flat-square
[build]: https://travis-ci.org/paulirish/commitlintbot
[coverage-badge]: https://img.shields.io/codecov/c/github/paulirish/commitlintbot.svg?style=flat-square
[coverage]: https://codecov.io/github/paulirish/commitlintbot
[version-badge]: https://img.shields.io/npm/v/commitlintbot.svg?style=flat-square
[package]: https://www.npmjs.com/package/commitlintbot
[downloads-badge]: https://img.shields.io/npm/dm/commitlintbot.svg?style=flat-square
[npmtrends]: http://www.npmtrends.com/commitlintbot
[license-badge]: https://img.shields.io/npm/l/commitlintbot.svg?style=flat-square
[license]: https://github.com/paulirish/commitlintbot/blob/master/LICENSE
[prs-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[prs]: http://makeapullrequest.com
[donate-badge]: https://img.shields.io/badge/$-support-green.svg?style=flat-square
[coc-badge]: https://img.shields.io/badge/code%20of-conduct-ff69b4.svg?style=flat-square
[coc]: https://github.com/paulirish/commitlintbot/blob/master/other/CODE_OF_CONDUCT.md
[github-watch-badge]: https://img.shields.io/github/watchers/paulirish/commitlintbot.svg?style=social
[github-watch]: https://github.com/paulirish/commitlintbot/watchers
[github-star-badge]: https://img.shields.io/github/stars/paulirish/commitlintbot.svg?style=social
[github-star]: https://github.com/paulirish/commitlintbot/stargazers
[twitter]: https://twitter.com/intent/tweet?text=Check%20out%20commitlintbot%20by%20%40paulirish%20https%3A%2F%2Fgithub.com%2Fpaulirish%2Fcommitlintbot%20%F0%9F%91%8D
[twitter-badge]: https://img.shields.io/twitter/url/https/github.com/paulirish/commitlintbot.svg?style=social
[emojis]: https://github.com/paulirish/all-contributors#emoji-key
[all-contributors]: https://github.com/paulirish/all-contributors
