const { format } = require('prettier')
const { readFile, writeFile } = require('fs/promises')

async function jsFileToLines (path, requirableNames = []) {
  const js = await readFile(path, 'utf-8')

  const indices = []
  // This JS "parsing" is quite lame and will probably break easily, will see
  let brackets = 0
  let comment = false
  for (let i = 0; i < js.length; i++) {
    if (comment) {
      if (js[i] === '\n') {
        comment = false
      }
    } else if ('[({'.includes(js[i])) {
      brackets++
    } else if ('])}'.includes(js[i])) {
      brackets--
    } else if (js.slice(i, i + 2) === '//') {
      comment = true
    } else if (brackets === 0) {
      // Only take top level vars and functions
      if (js.slice(i).match(/^(?:var|function)\s+\w+/)) {
        indices.push(i)
      }
    }
  }

  const exportedNames = []
  const requirables =
    requirableNames.length > 0
      ? new RegExp(`\\b(?:${requirableNames.join('|')})\\b`, 'g')
      : null
  let ts =
    'const lines: Record<string, (name: string, require: (name: string) => string) => string[]> = {'
  for (let i = 0; i < indices.length; i++) {
    const rawChunk = (i === indices.length - 1
      ? js.slice(indices[i])
      : js.slice(indices[i], indices[i + 1])
    ).replace(/^\/\/.*$/gm, '')
    let chunk
    try {
      chunk = format(rawChunk, { parser: 'babel', filepath: path }).trim()
    } catch {
      console.log(rawChunk)
      throw new Error(
        `Problem with formatting in ${path} (chunk ${i}, indices ${
          indices[i]
        } to ${indices[i + 1]}).`,
      )
    }
    const match = chunk.match(/^(?:var|function)\s+(\w+)/)
    if (!match) {
      throw new Error("Couldn't get variable/function name of chunk")
    }
    const varName = match[1]
    const varNameRegex = new RegExp(`\\b${varName}\\b`, 'g')
    const exportName = varName.endsWith('_') ? varName.slice(0, -1) : varName
    exportedNames.push(exportName)
    let requiresRequire = false
    const lines = chunk
      .split(/\r?\n/)
      .map((line, i) => {
        line = line.replace(varNameRegex, '${name}')
        if (requirables) {
          line = line.replace(requirables, name => {
            requiresRequire = true
            return `\${require(${JSON.stringify(name)})}`
          })
        }
        // ES5 code is unlikely to have ${...} so this should be fine
        return line.includes('${')
          ? `\`${JSON.stringify(line)
              .slice(1, -1)
              .replace(/\\"/g, '"')}\``
          : JSON.stringify(line)
      })
      .join(',')
    ts += `${exportName}: (name${
      requiresRequire ? ', require' : ''
    }) => [${lines}],\n\n`
  }
  ts += '}\n\nexport default lines'

  const tsPath = path.replace(/(?:\.es5)?\.js$/, '.ts')
  await writeFile(
    tsPath,
    format(ts, {
      parser: 'babel',
      filepath: tsPath,
      singleQuote: true,
      semi: false,
      arrowParens: 'avoid',
    }),
  )

  return exportedNames
}

async function main () {
  const helpers = await jsFileToLines('./src/compiler/helpers.es5.js')
  await jsFileToLines('./src/global-scope/globals.es5.js', helpers)
  await jsFileToLines('./src/native-modules/modules.es5.js', helpers)
}

if (require.main === module) {
  main()
}
