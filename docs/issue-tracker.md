# Issue Tracker

Issues and PRDs for this repository are tracked in GitHub Issues at
`LeFelps/stock-alerts`. Use the `gh` CLI from this repository for issue
operations.

## Conventions

- Create implementation issues in dependency order so blockers can reference
  existing issue numbers.
- Write issues as independently verifiable vertical slices with explicit
  acceptance criteria.
- Do not close or modify a parent issue when creating implementation issues
  from it.
- Use the repository's existing area, priority, and work-type labels. Do not
  create synonymous labels.

## Triage Labels

The repository uses these mappings for common triage states:

| Triage state                        | GitHub label   |
| ----------------------------------- | -------------- |
| Ready for agent implementation      | `type:afk`     |
| Requires human review or a decision | `type:hitl`    |
| Needs maintainer evaluation         | `needs-triage` |
| Waiting for reporter information    | `needs-info`   |
| Will not be actioned                | `wontfix`      |

The final three labels may not exist until the workflow needs them. Do not add
them to implementation-ready issues preemptively.
