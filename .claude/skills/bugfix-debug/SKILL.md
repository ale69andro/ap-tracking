# Bugfix Debug

Use this skill when something is broken or not working as expected.

## Rules
- Reproduce the issue before fixing
- Do NOT guess
- Identify the root cause
- Apply the smallest possible fix
- Do NOT change unrelated code

## Debug Thinking
- Check where the data comes from
- Follow the data flow (props, state, hooks)
- Look for wrong conditions or missing updates
- Verify side effects (e.g. useEffect)

## Implementation Rules
- Fix only the broken part
- Avoid rewriting components
- Keep the fix minimal and safe

## Workflow
1. Identify the issue
2. Locate the source of the bug
3. Explain the root cause
4. Apply minimal fix
5. Verify behavior