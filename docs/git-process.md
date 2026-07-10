# Git Process

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

Each pull request should mention its respective issue using GitHub closing
keywords so the issue closes automatically when the PR is merged.

Example:

```text
Closes #123
```
