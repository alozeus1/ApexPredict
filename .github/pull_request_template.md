<!--
  ApexPredict pull request template.
  Keep PRs scoped to one logical group. Target `develop` (integration), never `main`.
  See CONTRIBUTING.md for the branching model and commit convention.
-->

## Summary

<!-- What does this PR do and why? 2–5 sentences. -->

## Tickets closed

<!-- Backlog ticket IDs this PR closes, e.g. E00-S2-T1..T6. -->

-

## Quality gate output

<!-- Paste the output of the four gates. All must be green before review. -->

```
pnpm install
pnpm -F @apexpredix/db generate
pnpm -F @apexpredix/web typecheck
pnpm -F @apexpredix/web lint
pnpm -F @apexpredix/web test
```

<details>
<summary>Gate output</summary>

```
<!-- paste typecheck + lint + test output here -->
```

</details>

## Screenshots / diffs

<!-- For any UI change, attach before/after screenshots. For copy changes, paste the diff. -->

## Risks

<!-- Regression surface, migration safety, rollback plan, and anything a reviewer
     should look at carefully. State "none identified" only if you mean it. -->

## Checklist

- [ ] Branched off `develop`; not pushing to `main`/`develop` directly
- [ ] Conventional Commit messages
- [ ] No vendor secret added to the repo
- [ ] No copy claiming outcome certainty or future-return promises
- [ ] Quality gate green (output pasted above)
