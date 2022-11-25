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
  const issueNumber: number = parseInt(core.getInput('issue-number'))
  const labelId: string = core.getInput('label-id')
  const context = github.context
  const graphql = octokit.graphql.defaults({
    headers: {
      authorization: `token ${token}`
    }
  })

  const query = `
  query GetLabels($owner: String!, $repo: String!, $issueNumber: Int!, $limit: Int = 100) {
    repository(owner: $owner, name: $repo) {
      issue(number: $issueNumber) {
        id
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
    issueNumber
  })

  core.debug(JSON.stringify(queryResult))

  const issueId = queryResult.repository.issue.id
  const labels = queryResult.repository.issue.labels.nodes.map(x => x.id)
  labels.push(labelId)

  const mutation = `
  mutation SetLabel($issueId: ID!, $labels: [ID!]) {
    updateIssue(input: {
      id: $issueId,
      labelIds: $labels
    }) {
      clientMutationId
    }
  }
  `
  const mutationResult = await graphql(mutation, {
    issueId,
    labels
  })

  core.debug(JSON.stringify(mutationResult))
}

run()

interface GetLabelsResponse {
  repository: {
    issue: {
      id: string
      labels: {
        nodes: [{id: string}]
      }
    }
  }
}
