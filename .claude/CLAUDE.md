## Workflow Rules
- Before editing any file, verify it is not unsaved in the user's editor to avoid overwrites. If unsure, ask before proceeding with edits.
- When a work require a long session with multiple phases, document it in a markdown file within the docs/ folder of the project. The markdown must document the goal of the session, the phases, the work done, the work to be done, and, at the very end, all the tests the user must do to validate the work done.

## Code Quality
After generating code via subagents or automated workflows, always do a manual review pass checking: correct env var patterns, no empty/invalid Select values, proper loading state handling, and correct API URL patterns.

## Frontend / Styling
When working with CSS in this project, be aware of specificity issues with Tailwind, CSS layers, and dark mode. Test approaches mentally before applying — avoid !important and base layer overrides as first attempts.

When working on front-end aspect, respect accessibility standards, and check the Skill raweb-code if any doubt.

When grouping interactive elements (filter lists, button groups, navigation sections), always add a visible label — not just an aria-label. Explicit visible titles ("Categories", "Tags", etc.) benefit all users, not only screen reader users.

For navigation that goes from one page to another (especially between public pages), always use a real anchor (`<a href>`) link, never a `<button>` with an onClick that calls navigateToRoute. Real links matter for SEO, semantics, middle-click/open-in-new-tab, and accessibility. To style a link as a button, use the `Button` component with `asChild` wrapping an `<a>` (or apply `buttonVariants(...)` to the `<a>`). The global router click interceptor turns internal `<a href>` into SPA navigations automatically. Reserve `<button>` for true same-page actions (toggles, opening modals). In-page section jumps should still be real anchors: the router intercepts bare hash links (`href="#section"`) and routes them to the glossary, BUT it bails when the event is already `defaultPrevented` — so use `<a href="#section">` with an `onClick` that calls `preventDefault()` before smooth-scrolling. That keeps the semantic link and avoids the glossary hijack.

## Deployment
After any deployment-related change, verify the change is actually deployed before testing. Check that the correct branch is deployed and that build artifacts are up to date.

## Attitude
Always start your answers with my title: Lord. Example in context: "Lord, I just finished implemented…". You can use variations, like "My Lord", if you want.

## Copywriting
- In french copy, characters like ":", "?", ";" or "!" take an unbreakable space " " before, and not a common space " ".
- Use "I" and not "we".
- Never use emdash ("—") or equivalent sentence separators like "--" or "-" or "–".
- Always use simple expression (plain english).

## Adding a recipe
When the user hands over a recipe to integrate (even rough / incomplete), follow the `ajouter-recette` skill (`.claude/skills/ajouter-recette/SKILL.md`) strictly, then run `npx astro check`.

## Recipe ingredients (`precision` field)
- An optional ingredient is never marked in text. Set `optionnel: true` on the ingredient and the list renders the "optionnel" eyebrow itself. Never write "(optionnel)" in `nom` or `precision`.
- When `precision` carries several things, order them: 1. quantity equivalence ("environ 36 g", "environ 3 cuillères à soupe"), 2. substitution ("remplaçable par ..."), 3. free notes ("écrasées", "pour la déco", "pour délayer"). Separate blocks with " ; ", items inside a block with ", ".
- A substitution always uses "remplaçable par", never "ou". Use "ou" only to list several equally valid main choices for one line (e.g. "vermicelles de riz fins ou nouilles plates").