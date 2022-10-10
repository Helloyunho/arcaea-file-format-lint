import { checkAFF } from './lang.js'
import chalk, { Chalk } from 'chalk'
import { readFile } from 'node:fs/promises'
import meow from 'meow'
import { AFFErrorLevel } from './types.js'

const args = meow(
  `
  Usage
    $ aff-lint <file>
  
  Options
    --fix, -f  Try to fix errors automatically
`,
  {
    flags: {
      fix: {
        type: 'boolean',
        alias: 'f'
      }
    }
  }
)

const main = async (files: string[], { fix: boolean }) => {
  for (const file of files) {
    const content = await readFile(file, 'utf-8')
    const errors = checkAFF(content)
    for (const error of errors) {
      let chalkColor: Chalk
      let level: string
      switch (error.severity) {
        case AFFErrorLevel.Info:
          chalkColor = chalk.blue
          level = 'Info'
          break
        case AFFErrorLevel.Warning:
          chalkColor = chalk.yellow
          level = 'Warning'
          break
        case AFFErrorLevel.Error:
          chalkColor = chalk.red
          level = 'Error'
          break
      }
      console.log(
        chalkColor.bold(level) +
          `: ${file}:${error.location.startLine}:${error.location.startColumn} ${error.message}`
      )
    }
  }
}

main(args.input, args.flags)
