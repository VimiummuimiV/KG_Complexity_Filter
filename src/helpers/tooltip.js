let tooltipEl = null, tooltipHideTimer = null, tooltipShowTimer = null;
let tooltipIsVisible = false, tooltipIsShown = false, tooltipCurrentTarget = null;

const TOOLTIP_MARGIN = 10; // px gap from viewport edges

const positionTooltip = (clientX, clientY) => {
  if (!tooltipEl) return;
  const screenWidth  = window.innerWidth;
  const screenHeight = window.innerHeight;

  // ── Horizontal ───────────────────────────────────────────────────────────
  const tooltipWidth = tooltipEl.offsetWidth;
  const leftPos = Math.min(Math.max(clientX + 10, TOOLTIP_MARGIN), screenWidth - tooltipWidth - TOOLTIP_MARGIN);

  // ── Vertical: dynamic max-height + flip above cursor when needed ─────────
  const spaceBelow = screenHeight - (clientY + 18) - TOOLTIP_MARGIN;
  const spaceAbove = clientY - 18 - TOOLTIP_MARGIN;
  const naturalH   = tooltipEl.scrollHeight;

  let topPos, maxH;
  if (naturalH <= spaceBelow || spaceBelow >= spaceAbove) {
    // Fits below, or below has more room — anchor below cursor
    maxH   = spaceBelow;
    topPos = clientY + 18;
  } else {
    // More room above — anchor above cursor
    maxH   = spaceAbove;
    topPos = clientY - 18 - Math.min(naturalH, spaceAbove);
  }

  tooltipEl.style.left      = `${leftPos}px`;
  tooltipEl.style.top       = `${Math.max(TOOLTIP_MARGIN, topPos)}px`;
  tooltipEl.style.maxHeight = `${Math.max(0, maxH)}px`;
  tooltipEl.style.overflowY = maxH < naturalH ? 'auto' : '';
};

const tooltipTrackMouse = e => tooltipEl && positionTooltip(e.clientX, e.clientY);

export function hideTooltipElement() {
  tooltipIsVisible = false;
  tooltipCurrentTarget = null;
  clearTimeout(tooltipShowTimer);
  clearTimeout(tooltipHideTimer);

  tooltipHideTimer = setTimeout(() => {
    if (!tooltipEl) return;
    tooltipEl.style.opacity = '0';
    tooltipIsShown = false;

    setTimeout(() => {
      if (!tooltipIsVisible && tooltipEl) {
        tooltipEl.style.display = 'none';
        tooltipEl.textContent = '';
        document.removeEventListener('mousemove', tooltipTrackMouse);
      }
    }, 50);
  }, 100);
}

new MutationObserver(() => {
  if (tooltipCurrentTarget && !document.contains(tooltipCurrentTarget)) hideTooltipElement();
}).observe(document, { childList: true, subtree: true });

export function createCustomTooltip(element, tooltipContent, type = 'info', delay = null) {
  if (tooltipContent == null) return; // Skip if content is null/undefined
  
  // Always update the tooltip content stored on the element.
  element._tooltipContent = tooltipContent;
  element._tooltipType = type;
  if (delay !== null) element._tooltipDelay = delay;

  // ── LIVE UPDATE ──────────────────────────────────────────────────────────────
  // If this element is currently hovered and the tooltip is visible, push the
  // new content straight into the DOM without the tooltip disappearing.
  if (tooltipCurrentTarget === element && tooltipIsVisible && tooltipEl) {
    clearTimeout(tooltipShowTimer);
    tooltipEl.innerHTML = highlightTooltipActions(tooltipContent);
    tooltipEl.style.display = 'flex';
    tooltipEl.style.opacity = '1';
    tooltipIsShown = true;
  }
  // ─────────────────────────────────────────────────────────────────────────────

  if (!element._tooltipInitialized) {
    element._tooltipInitialized = true;

    tooltipEl ||= (() => {
      const tooltipDiv = document.createElement('div');
      tooltipDiv.classList.add("custom-tooltip-popup");
      tooltipDiv.style.display = 'none';
      tooltipDiv.style.opacity = '0';
      document.body.appendChild(tooltipDiv);
      return tooltipDiv;
    })();

    element.addEventListener('mouseenter', e => {
      tooltipIsVisible = true;
      tooltipCurrentTarget = element;
      clearTimeout(tooltipHideTimer);
      clearTimeout(tooltipShowTimer);

      // Highlight [Action]Message pairs and headers in the tooltip content
      tooltipEl.innerHTML = highlightTooltipActions(element._tooltipContent);
      tooltipEl.style.display = 'flex';
      positionTooltip(e.clientX, e.clientY);
      document.addEventListener('mousemove', tooltipTrackMouse);

      if (tooltipIsShown) {
        // Already visible from a previous element — swap content instantly
        tooltipEl.style.opacity = '1';
      } else {
        // First appearance — fade in after delay
        const showDelay = element._tooltipDelay ?? 150;
        tooltipEl.style.opacity = '0';
        tooltipEl.offsetHeight; // force reflow for transition
        tooltipShowTimer = setTimeout(() => {
          tooltipEl.style.opacity = '1';
          tooltipIsShown = true;
        }, showDelay);
      }
    });

    element.addEventListener('mouseleave', () => {
      hideTooltipElement();
      document.removeEventListener('mousemove', tooltipTrackMouse);
    });

    element.addEventListener('wheel', e => {
      if (!tooltipEl || tooltipEl.style.display === 'none') return;
      if (tooltipEl.scrollHeight <= tooltipEl.clientHeight) return;
      e.preventDefault();
      tooltipEl.scrollTop += e.deltaY;
    }, { passive: false });
  }
}

/**
 * Update tooltip content for an existing element
 * @param {HTMLElement} element - The element with tooltip
 * @param {string} newContent - New tooltip content
 * @param {string} type - Tooltip type ('info', 'stats', etc.)
 */
export function updateTooltipContent(element, newContent, type = 'info') {
  if (!element._tooltipInitialized) {
    // If tooltip wasn't initialized, create it
    createCustomTooltip(element, newContent, type);
    return;
  }
  
  // Update the stored content and type
  element._tooltipContent = newContent;
  element._tooltipType = type;
  
  // If this element is currently being hovered (even if tooltip isn't fully shown yet)
  if (tooltipCurrentTarget === element && tooltipIsVisible && tooltipEl) {
    tooltipEl.innerHTML = highlightTooltipActions(newContent);

    // Only force-show immediately for deliberate user actions (e.g. stats on Ctrl+hover).
    // For 'info' type, the show timer set by mouseenter is already running — let it fire
    // naturally so the configured delay (e.g. 1200ms) is always respected.
    if (!tooltipIsShown && type === 'stats') {
      clearTimeout(tooltipShowTimer);
      tooltipEl.style.opacity = '1';
      tooltipIsShown = true;
    }
  }
}

function highlightTooltipActions(str) {
  let result = '';
  const headerRegex = /(## [^[]*)/g;
  const actionRegex = /\[([^\]]+)\]([^\[]*)(?:\[\]([^\[]*))?/g;

  const parts = str.split(headerRegex);

  parts.forEach(part => {
    if (part.startsWith('## ')) {
      const header = part.slice(3).trim();
      result += `<div class="tooltip-header">${header}</div>`;
    } else {
      actionRegex.lastIndex = 0;
      const matches = [...part.matchAll(actionRegex)];

      if (matches.length) {
        matches.forEach(match => {
          const action = match[1];
          const [message, ...subLines] = match[2].trim().split('||').map(s => s.trim());
          result += `
            <div class="tooltip-item">
              <span class="tooltip-action">${action}&nbsp;</span>
              <span class="tooltip-message">${message}</span>
            </div>
            ${subLines.map(l => `<div>${l}</div>`).join('')}`;
        });
      } else if (part.trim()) {
        result += `
          <div class="tooltip-item">
            <span class="tooltip-message">${part.trim()}</span>
          </div>`;
      }
    }
  });

  return result;
}