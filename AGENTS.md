# GetHired billing integration rules

- Never consume GitHub Actions credits/minutes, including free minutes. Before every push, verify `gh api repos/Upupapp/get-hired-BE/actions/permissions --jq .enabled` returns false. Do not enable, dispatch, or rerun workflows.
- Never touch LGUIDS tenant, data, screens, or configuration.
- Run checks locally. Use direct server deployment only when the scoped release is ready; avoid Netlify builds.
- Preserve the original uncommitted work in `/Users/user/Documents/ChatGPT/GETHIRED`. This worktree integrates a copy onto current production code.
- This billing foundation is disabled by default. The current task integrates and tests code; live migrations, payment authorization and delivery enablement remain separate rollout steps.
