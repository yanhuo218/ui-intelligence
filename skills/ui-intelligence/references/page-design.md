# Page Design and Interaction Requirements

## Two-level navigation

For a new multi-route workspace, use a shared application shell. Put related routes under a named group, such as Projects and Tasks under Workspace. Give each child a real, directly addressable route. Use top-level links for standalone destinations. Where the user specifies a navigation model, use that model and verify the applicable behavior below.

- **Desktop.** Keep the sidebar in view as the main content scrolls. Scroll the navigation independently when its content exceeds the available height. Expand the child list directly below its parent. Give children consistent indentation, make the active child visible, and give its parent a distinct active-group state.
- **Mobile.** Place the same hierarchy in a drawer controlled by a labeled header button. Keep the closed drawer out of the keyboard path. If the drawer is modal, keep keyboard focus inside it while open. Close it on selection, including selection of the current route, and move focus to the new page heading for route changes. On Escape or explicit dismissal, return focus to the opener.
- **Route state.** Derive the active child from the route and give it `aria-current="page"`. Use a button with `aria-expanded` and `aria-controls` for each group. Open the matching group on direct entry, refresh, and history navigation. The user can collapse it on the current page. Open it again when re-entering a child route or reopening the mobile drawer there.
- **Keyboard.** Tab reaches the group and the visible links. Enter or Space toggles the group. Test navigation and dismissal with the keyboard and verify the final focus location. Keep the menu available without hover. If an action removes the focused row or control, move focus to the next logical item or the related filter or trigger.

## Favicon, icons, and text hierarchy

- For new websites, supply a recognizable favicon derived from the site identity and link it in the document head. For shell or branding work in an existing app, check and reuse its favicon when suitable. Verify the asset is served as an image and displays in a fresh browser tab. Give major routes distinct browser titles that identify the page and product.
- Map icons to specific actions, destinations, or entities. Reuse one icon for the same meaning across views. Use distinguishable symbols for different meanings that appear together. Review the rendered navigation, toolbar, and cards to catch repeated generic SVGs that obscure those differences. Use a consistent icon family and give icon-only controls accessible labels.
- Use the existing typography scale or define a small scale for headings, readable body text, controls, and supporting details. Give each page a clear primary heading and action. Keep labels, useful metadata, and state feedback. Remove decorative eyebrows, repeated tags, and copy that restates nearby content. Keep essential status and action text at a readable size on narrow screens, and communicate important distinctions with text or shape as well as color.

## Motion and visual feedback

- Plan motion when designing a new visual experience or redesigning the shell. Name the trigger, visible state change, and purpose for each important effect. Prioritize transitions that explain hierarchy, connect the previous and next state, or confirm an action. For a motion-heavy brief, plan one focal effect and supporting motion for relevant panels, data updates, and control feedback.
- Reuse the project's motion system. Prefer CSS for simple transitions and use a motion library when coordinating layout, shared elements, or sequences materially benefits the requested experience. Assign short timings to interactive feedback and use a consistent easing scheme. Keep content and controls available during motion. Let repeated input reach the latest state without waiting for an earlier animation.
- Honor `prefers-reduced-motion` in both CSS and script-driven effects. Remove or shorten large movement, parallax, and loops while preserving feedback and state changes. Verify representative effects in the browser at desktop and narrow widths, including the reduced-motion path. Use a short recording when the requested proof depends on timing or continuity.
