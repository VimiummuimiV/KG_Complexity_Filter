export const en = {
    // Header
    title:          'Typing Complexity',
    btnCycleView:   'Cycle view',
    btnToggleTheme: 'Toggle theme',
    btnClose:       'Close',

    // Score tiers
    tierEasy:   'Easy',
    tierMedium: 'Moderate',
    tierHard:   'Hard',

    // Meta rows
    metaAvg:        'Avg cost / char',
    metaChars:      'Characters',
    metaHardZones:  'Hard zones',
    metaLongWords:  'Long words',
    metaLayout:     'Layout',

    // Hand balance
    handImbalanceHigh:   '⚠ one-sided',
    handImbalanceMid:    '⚠ dominant hand',
    handImbalanceLow:    '⚠ lopsided',
    handImbalanceMinor:  'uneven',

    // Penalty breakdown
    penaltyLabel:     'Penalty breakdown',
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
    topWords:         'Hardest words',

    // Finger names — shown as bar labels in the finger-load chart
    fingers: ['L pinky', 'L ring', 'L mid', 'L idx+', 'L idx', 'R idx', 'R idx+', 'R mid', 'R ring', 'R pinky'],

    // Tooltips
    tooltipAvg:          'Average cost per character — lower means easier to type',
    tooltipChars:        'Total number of characters in the text',
    tooltipHardZones:    'Share of characters that fall in hard-difficulty segments',
    tooltipLongWords:    'Share of words exceeding 8 characters — longer words tire fingers faster',
    tooltipDigitRow:     'Share of keystrokes on the number row — the most awkward row to reach',
    tooltipHandL:        'Left hand share of total keystrokes',
    tooltipHandR:        'Right hand share of total keystrokes',
    tooltipBigram:       'Accumulated cost of this two-key combination across the whole text',
    tooltipTopWord:      'Total typing cost for this word (higher = harder to type)',
    tooltipLongWordText: 'Long word — extra fatigue penalty applied beyond 8 characters',
    tooltipHardText:     'Hard zone — high typing cost due to awkward key combinations',
    tooltipWorstZone:    'Worst zone — the highest-cost hard segment in the text',
    tooltipPenalty_sameFinger:  'Two consecutive keys pressed with the same finger',
    tooltipPenalty_outwardRoll: 'Roll away from the index finger — less natural than inward rolls',
    tooltipPenalty_scissor:     'Adjacent fingers spanning 2+ rows simultaneously',
    tooltipPenalty_rowJump:     'Large vertical reach between keyboard rows',
    tooltipPenalty_shiftHold:   'Shift held on the same side as the key being typed',
    tooltipPenalty_other:       'Base key cost: row position, finger weight, and character frequency',

    // Language toggle — icon shows the CURRENT language (EN is active)
    langIcon:  '🇬🇧',
    langLabel: 'Switch to Russian',
};