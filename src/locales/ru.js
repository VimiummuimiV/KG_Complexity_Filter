export const ru = {
    // Header
    title:          'Сложность набора',
    btnCycleView:   'Режим отображения',
    btnToggleTheme: 'Тема',
    btnClose:       'Закрыть',

    // Score tiers
    tierEasy:   'Легко',
    tierMedium: 'Средне',
    tierHard:   'Сложно',

    // Meta rows
    metaAvg:        'Ср. стоимость / символ',
    metaChars:      'Символов',
    metaHardZones:  'Сложные зоны',
    metaLongWords:  'Длинные слова',
    metaLayout:     'Раскладка',

    // Hand balance
    handImbalanceHigh:  '⚠ одна рука',
    handImbalanceMid:   '⚠ доминирует рука',
    handImbalanceLow:   '⚠ перекос',
    handImbalanceMinor: 'неравномерно',

    // Penalty breakdown
    penaltyLabel:      'Штрафы',
    penaltySameFinger: 'Один палец',
    penaltyOutward:    'Внешний перекат',
    penaltyScissor:    'Ножницы',
    penaltyRowJump:    'Прыжок по ряду',
    penaltyShift:      'Удержание Shift',
    penaltyOther:      'База',

    // Sections
    hardestBigrams: 'Сложные биграммы',
    worstZone:      'Худший участок',
    fingerLoad:     'Нагрузка на пальцы',
    topWords:       'Сложные слова',

    // Finger names — shown as bar labels in the finger-load chart
    fingers: ['Мизинец Л', 'Безымян Л', 'Средний Л', 'Указ+ Л', 'Указат Л', 'Указат П', 'Указ+ П', 'Средний П', 'Безымян П', 'Мизинец П'],

    // Подсказки
    tooltipAvg:          'Средняя стоимость одного символа — чем ниже, тем легче набирать',
    tooltipChars:        'Общее количество символов в тексте',
    tooltipHardZones:    'Доля символов в сегментах высокой сложности',
    tooltipLongWords:    'Доля слов длиннее 8 символов — длинные слова быстрее утомляют пальцы',
    tooltipDigitRow:     'Доля нажатий на цифровом ряду — самом неудобном для достижения',
    tooltipHandL:        'Доля нажатий левой рукой',
    tooltipHandR:        'Доля нажатий правой рукой',
    tooltipBigram:       'Накопленная стоимость этой пары символов по всему тексту',
    tooltipTopWord:      'Суммарная стоимость набора слова (выше = труднее набирать)',
    tooltipLongWordText: 'Длинное слово — применяется штраф за усталость после 8 символов',
    tooltipHardText:     'Сложная зона — высокая стоимость из-за неудобных комбинаций клавиш',
    tooltipWorstZone:    'Худший участок — самый сложный для набора фрагмент текста',
    tooltipPenalty_sameFinger:  'Два подряд идущих символа нажаты одним пальцем',
    tooltipPenalty_outwardRoll: 'Перекат от указательного к мизинцу — менее естественен чем внутренний',
    tooltipPenalty_scissor:     'Соседние пальцы одновременно охватывают 2+ ряда',
    tooltipPenalty_rowJump:     'Большой вертикальный прыжок между рядами клавиатуры',
    tooltipPenalty_shiftHold:   'Shift зажат той же рукой, что и набираемый символ',
    tooltipPenalty_other:       'Базовая стоимость клавиши: ряд, палец, частота символа',

    // Language toggle — icon shows the CURRENT language (RU is active)
    langIcon:  '🇷🇺',
    langLabel: 'Switch to English',
};