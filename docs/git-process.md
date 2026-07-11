# Git Process

## Branches

Start every new change on a dedicated branch based on `main`. Before creating
the branch, fetch `origin` and rebase the local `main` branch onto the latest
`origin/main` so new work includes the most recent upstream changes.

If work has already started, rebase the working branch onto the latest
`origin/main` before continuing and resolve any conflicts against the updated
codebase.

## Commits

Use Conventional Commits for commit messages:

```text
<type>(optional-scope): <description>
```

Examples:

```text
feat(alerts): add threshold rule evaluation
fix(auth): handle missing profile session
docs: document git process
```

## Pull Requests

Open pull requests as ready for review by default. Use draft pull requests only
when the request explicitly asks for a draft or says the work is not ready for
review yet.

Each pull request should mention its respective issue using GitHub closing
keywords so the issue closes automatically when the PR is merged.

Example:

```text
Closes #123
```
