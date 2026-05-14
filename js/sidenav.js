/* Highlight the sidenav link whose section is currently in view.
 *
 * Uses IntersectionObserver with a viewport band biased to the upper third
 * of the screen — feels right when the user is reading top-down.
 */

const links = Array.from(document.querySelectorAll('.sidenav-list a'));
const sections = links
  .map(a => document.querySelector(a.getAttribute('href')))
  .filter(Boolean);

if (sections.length) {
  const linkFor = new Map(
    links.map(a => [a.getAttribute('href').slice(1), a]),
  );

  const visible = new Set();

  const observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) visible.add(e.target.id);
      else                   visible.delete(e.target.id);
    }
    // Pick the topmost visible section
    const ordered = sections
      .map(s => s.id)
      .filter(id => visible.has(id));
    const activeId = ordered[0];
    for (const a of links) a.classList.remove('active');
    if (activeId) {
      const a = linkFor.get(activeId);
      if (a) a.classList.add('active');
    }
  }, {
    rootMargin: '-20% 0px -55% 0px',
    threshold: 0,
  });

  for (const s of sections) observer.observe(s);
}
