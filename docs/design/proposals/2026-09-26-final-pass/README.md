# 01. Give the user-page heading an opaque surface

**Observed:** On `/admin/users`, the title, description, and Create button sit directly over the detailed background illustration. The table is already on a solid white surface, so the header has weaker separation and visual hierarchy.

**Proposal:** Put the existing title block and Create button on a solid white card aligned to the table width. Match the existing corner radius, border, and restrained shadow. Leave the illustration visible around the card and keep all page content and account data unchanged.

**Before:** [01-users-heading-before.png](./01-users-heading-before.png), captured from the live `/admin/users` page during the final QA pass.

**After concept:** [01-users-heading-after.png](./01-users-heading-after.png)

This is a numbered visual proposal only; the production UI has not been changed for this suggestion. The current solid cards and opaque super-admin panels remain in place.

---

# 02. Move the operations status out of page content

**Observed:** The floating “System operations” rail covers the lower-right portion of the admin dashboard’s data-quality grid. On chat screens it also sits above the conversation area. A code fix now keeps the rail compact by default, but the compact rail still overlaps page content.

**Proposal:** Replace the floating card with a narrow status strip directly below the workspace header. Keep “Backend unavailable” or the current status visible, and expand diagnostics only when the admin opens the strip. The main content remains unobstructed.

**Before:** The expanded floating panel was captured in the native Chrome QA pass and shown inline in the Codex task.

**After concept:** [02-operations-status-strip-after.png](./02-operations-status-strip-after.png)

This is a numbered visual proposal only. The UI currently uses the compact floating rail; this relocation awaits selection.
