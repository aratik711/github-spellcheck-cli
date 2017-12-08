const promisify = require('es6-promisify');
const GitHubApi = require('github');
const _ = require('lodash');

const github = new GitHubApi();

function githubAuthenticate() {
  github.authenticate({
    type: 'token',
    token: process.env.GITHUB_TOKEN,
  });
}

async function getAllPages(endpoint, parameters) {
  let currentPage = await promisify(endpoint)(parameters);
  let allPages = currentPage.data;
  while (await github.hasNextPage(currentPage)) {
    currentPage = await github.getNextPage(currentPage);
    allPages = _.concat(allPages, currentPage.data);
  }
  return allPages;
}

exports.createPullRequest = async function(owner, repo, head) {
  githubAuthenticate()
  const { data } = await promisify(github.pullRequests.create)({
    owner,
    repo,
    head,
    base: 'master',
    title: 'Fix typos',
  });
  return data;
}

exports.findForkOfRepo = async function(fullName, authenticatedUserRepos) {
  const forks = _.filter(authenticatedUserRepos, 'fork');
  const getRepo = promisify(github.repos.get);
  let result;

  for (let i = 0; i < forks.length; i += 1) {
    const { owner: { login: owner }, name: repo } = forks[i];
    githubAuthenticate();
    const fork = (await getRepo({ owner, repo })).data;
    if (fork.source.full_name === fullName) {
      result = fork;
      break;
    }
  }

  return result;
}

exports.forkRepo = async function(owner, repo) {
  githubAuthenticate();
  return (await promisify(github.repos.fork)({ owner, repo })).data;
}

exports.getAllReposForAuthenticatedUser = async function() {
  githubAuthenticate();
  return getAllPages(github.repos.getAll, { type: 'all' });
}