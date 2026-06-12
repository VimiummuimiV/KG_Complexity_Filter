export const en = {
    // Header
    title:          'Typing Complexity',
    btnClose:       'Close',

    // View mode tooltips — describe the mode you're switching TO
    tooltipView_full:    'Switch to full view',
    tooltipView_summary: 'Switch to summary view',
    tooltipView_minimal: 'Switch to minimal view',

    // Theme tooltips — describe the theme you're switching TO
    tooltipThemeDark:  'Switch to dark theme',
    tooltipThemeLight: 'Switch to light theme',

    // Score tiers
    tierEasy:   'Easy',
    tierMedium: 'Moderate',
    tierHard:   'Hard',

    // Meta rows
    metaAvg:        'Avg cost',
    metaChars:      'Characters',
    metaHardZones:  'Hard zones',
    metaLongWords:  'Long words',
    metaLayout:     'Layout',
    metaDigitRow:   'Digit row',

    // Hand balance
    handImbalanceHigh:   '⚠ one-sided',
    handImbalanceMid:    '⚠ dominant hand',
    handImbalanceLow:    '⚠ lopsided',
    handImbalanceMinor:  'uneven',

    // Penalty breakdown
    penaltyBreakdown:  'Penalty breakdown',
    penaltySameFinger: 'Same finger',
    penaltyOutward:    'Outward roll',
    penaltyScissor:    'Scissor',
    penaltyRowJump:    'Row jump',
    penaltyShift:      'Shift hold',
    penaltyOther:      'Base cost',

    // Sections
    hardestBigrams:   'Hardest bigrams',
    worstZone:        'Worst zone',
    fingerLoad:       'Finger load',
    hardestWords:     'Hardest words',
    handBalance:      'Hand balance',
    costHistogram:    'Cost distribution',

    // Finger names — shown as bar labels in the finger-load chart
    fingers: ['L pinky', 'L ring', 'L mid', 'L idx+', 'L idx', 'R idx', 'R idx+', 'R mid', 'R ring', 'R pinky'],

    // Tooltips
    tooltipAvg:          'Average cost per character — lower means easier to type',
    tooltipChars:        'Total number of characters in the text',
    tooltipHardZones:    'Share of characters that fall in hard-difficulty segments',
    tooltipLongWords:    'Share of words exceeding the base length threshold — longer words tire fingers faster',
    tooltipDigitRow:     'Share of keystrokes on the number row — the most awkward row to reach',
    tooltipHandL:        'Left hand share of total keystrokes',
    tooltipHandR:        'Right hand share of total keystrokes',
    tooltipBigram:       'Total weight of this key pair accumulated across the whole text',
    tooltipTopWord:      'Total typing cost for this word — the higher, the harder to type',
    tooltipLongWordText: 'Long word — extra fatigue penalty applied beyond 8 characters',

    // Zone descriptions
    tooltipEasyText:     'Easy zone — comfortable to type',
    tooltipMediumText:   'Medium zone — moderate typing difficulty',
    tooltipHardText:     'Hard zone — requires more complex finger movements',

    tooltipWorstZone:    'Worst zone — the most demanding stretch of text to type',
    tooltipSameFingerL:  'This character is part of a same-finger bigram (left hand)',
    tooltipSameFingerR:  'This character is part of a same-finger bigram (right hand)',
    tooltipShifted:      'Requires holding Shift',
    tooltipPenalty_sameFinger:  'Two consecutive keys pressed with the same finger',
    tooltipPenalty_outwardRoll: 'Roll toward the pinky — less natural than rolling toward the index finger',
    tooltipPenalty_scissor:     'Adjacent fingers spanning 2+ rows simultaneously',
    tooltipPenalty_rowJump:     'Large vertical reach between keyboard rows',
    tooltipPenalty_shiftHold:   'Shift held on the same side as the key being typed',
    tooltipPenalty_other:       'Base key cost: position on keyboard, finger load, and character rarity',

    // Lang / Layout chip in meta-info row
    tooltipLang:           'Switch keyboard language',
    tooltipLayout:         'Switch keyboard layout',
    tooltipShowKeyboard:   'Show keyboard layout',
    tooltipHideKeyboard:   'Hide keyboard layout',
    tooltipKeyboardPin:    'Pin — open automatically next time',
    tooltipKeyboardUnpin:  'Unpin — open manually next time',
    alertLangIncompatible: 'This text is not compatible with the selected language',

    // Keyboard panel button tooltips
    tooltipKbModeZones:      'Switch to finger zones',
    tooltipKbModeHeatCount:  'Switch to heat map (count)',
    tooltipKbModeHeatCost:   'Switch to heat map (cost)',
    tooltipKbModeZonesShort: 'zones',
    tooltipKbModeCountShort: 'count',
    tooltipKbModeCostShort:  'cost',
    tooltipKbModeToggle:     'Toggle between ($1 and $2)',
    tooltipKbCountOn:        'Show counts on keyboard keys',
    tooltipKbCountOff:       'Hide counts on keyboard keys',
    tooltipKbCostSum:        'Show total cost per key',
    tooltipKbCostAvg:        'Show average cost per press',

    // Language toggle — icon shows the CURRENT language (EN is active)
    langIcon:  '🇬🇧',
    langLabel: 'Switch to Russian',

    // Section header tooltips
    tooltipClick:              'Click',
    tooltipSectionExpand:      'Expand',
    tooltipSectionCollapse:    'Collapse',
    tooltipSectionSolo:        'Collapse all others',
    tooltipSectionToggleAll:   'Expand / collapse all',
};