const optionsCell = `(a) the number of children born per 1000 people in the population in a
year.
(b) the number of children born to a couple in their lifetime in a
given geographical area.
(c) the birth rate minus death rate.
(d) the average number of live births a woman would have by the end of
her reproductive life.`;

function parseOptions(optionsCell) {
    if (!optionsCell) return null
    const result = { a: '', b: '', c: '', d: '' }

    // Strategy 1: line-by-line assembly (highly robust for newlines)
    let currentKey = null
    const lines = optionsCell.split('\n')
    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) {
            if (currentKey) result[currentKey] += '\n'
            continue
        }
        // Match things like 'a)', '(a)', 'a.', '(a).'
        const match = trimmed.match(/^\(?([abcdABCD])\)?[.)]\s*(.+)/)
        if (match) {
            currentKey = match[1].toLowerCase()
            result[currentKey] = match[2].trim()
        } else if (currentKey) {
            const prefix = result[currentKey] && !result[currentKey].endsWith('\n') ? '\n' : ''
            result[currentKey] += prefix + trimmed
        }
    }

    if (result.a && result.b && result.c && result.d) return result
    return null
}

console.log(parseOptions(optionsCell));
