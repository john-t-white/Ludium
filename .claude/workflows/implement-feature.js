export const meta = {
  name: 'implement-feature',
  description: 'Parallel agent implementation of a GitHub issue with QA and security verification',
  phases: [
    { title: 'Schema', detail: 'Database migrations' },
    { title: 'API', detail: 'Backend implementation' },
    { title: 'Frontend', detail: 'UI implementation' },
    { title: 'Verify', detail: 'QA tests and security review' },
  ]
}

const { issueNumber, branch, plan } = args
const NO_COMMIT = 'Do NOT commit or push any changes — make changes to the working tree only. The user must approve before anything is committed.'

// Step 1: Schema first — API depends on it
phase('Schema')
const dbResult = plan.db
  ? await agent(
      `Implement the database changes for GitHub issue #${issueNumber} on branch ${branch}.
       Approved plan: ${plan.db}
       ${NO_COMMIT}`,
      { label: 'implement:db', agentType: 'postgresql-developer', isolation: 'worktree' }
    )
  : null

// Step 2: API next — depends on schema, frontend depends on API
phase('API')
const apiResult = plan.api
  ? await agent(
      `Implement the API changes for GitHub issue #${issueNumber} on branch ${branch}.
       Approved plan: ${plan.api}
       Database changes already applied: ${dbResult ?? 'none'}
       ${NO_COMMIT}`,
      { label: 'implement:api', agentType: 'dotnet-api', isolation: 'worktree' }
    )
  : null

// Step 3: Frontend — depends on API contract
phase('Frontend')
const webResult = plan.web
  ? await agent(
      `Implement the frontend changes for GitHub issue #${issueNumber} on branch ${branch}.
       Approved plan: ${plan.web}
       API changes already applied: ${apiResult ?? 'none'}
       ${NO_COMMIT}`,
      { label: 'implement:web', agentType: 'nextjs-frontend', isolation: 'worktree' }
    )
  : null

// Step 4: QA and security in parallel
phase('Verify')
const [qaResult, securityResult] = await parallel([
  () => agent(
    `Verify the implementation of GitHub issue #${issueNumber} on branch ${branch}.
     Run all relevant tests and report results. Flag any failures or missing coverage.
     ${NO_COMMIT}`,
    { label: 'verify:qa', agentType: 'qa-engineer' }
  ),
  () => agent(
    `Review the security of the implementation of GitHub issue #${issueNumber} on branch ${branch}.
     Check for vulnerabilities, auth issues, and secrets. Approve or flag concerns.
     ${NO_COMMIT}`,
    { label: 'verify:security', agentType: 'security-engineer' }
  )
])

return {
  issue: issueNumber,
  branch,
  implemented: { db: !!dbResult, api: !!apiResult, web: !!webResult },
  qa: qaResult,
  security: securityResult,
  awaitingApproval: true
}
