import * as core from '@actions/core'
import * as github from '@actions/github'

async function run(): Promise<void> {
  try {
    await actuallyRun()
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

async function actuallyRun(): Promise<void> {
  const token = core.getInput('token')
  const octokit = github.getOctokit(token)
  const issueId: string = core.getInput('issue-id')
  const labelId: string = core.getInput('label-id')
  const context = github.context
  const graphql = octokit.graphql.defaults({
    headers: {
      authorization: `token ${token}`
    }
  })

  const query = `
query GetLabels($owner: String!, $repo: String!, $issueId: String!, $labelId: String!, $limit: Int = 1000) {
  repository(owner: $owner, $repo: $repo) {
    issue(id: $issueId) {
      labels(first: $limit) {
        nodes {
          id
        }
      }
    }
  }
}`
  const queryResult: GetLabelsResponse = await graphql(query, {
    ...context.repo,
    issueId,
    labelId
  })

  core.setOutput('result', JSON.stringify(queryResult))
}

run()

interface GetLabelsResponse {
  repository: {
    issue: {
      labels: {
        nodes: [{id: string}]
      }
    }
  }
}
