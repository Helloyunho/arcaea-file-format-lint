import { checkAFF } from './lang.js'
import chalk, { Chalk } from 'chalk'
import { readFile, writeFile } from 'node:fs/promises'
import meow from 'meow'
import {
  AFFArcEvent,
  AFFArcKind,
  AFFBool,
  AFFErrorLevel,
  AFFErrorType,
  AFFEvent,
  AFFFloat,
  AFFTimingEvent
} from './types.js'
import { ToScript } from './to-script.js'

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

const main = async (files: string[], { fix }: { fix: boolean }) => {
  for (const file of files) {
    if (fix) {
      const content = await readFile(file, 'utf-8')
      const [errors, ast] = checkAFF(content)
      const patches: {
        start: number
        end: number
        delete?: boolean
        replace?: any
      }[] = []
      if (errors.length > 0) {
        for (const error of errors) {
          switch (error.type) {
            case AFFErrorType.DuplicatedState:
            case AFFErrorType.DuplicatedTiming:
            case AFFErrorType.ItemCutByTiming:
            case AFFErrorType.TapItemOutOfBound:
            case AFFErrorType.HoldItemOutOfBound:
            case AFFErrorType.DuplicatedArcTap:
            case AFFErrorType.OverlappedItem:
            case AFFErrorType.ArcNonNegativeDuration:
            case AFFErrorType.ArcZeroDurationNoArctap:
            case AFFErrorType.ArcArctapInTimeRange:
            case AFFErrorType.DuplicatedMetadataKey:
            case AFFErrorType.TimingGroupNestedItem:
            case AFFErrorType.HoldPositiveDuration:
              patches.push({
                start: error.location.startOffset,
                end: error.location.endOffset,
                delete: true
              })
              break
            case AFFErrorType.FloatValueNotTwoDigits:
              patches.push({
                start: error.location.startOffset,
                end: error.location.endOffset,
                replace: (float: AFFFloat): AFFFloat => {
                  return {
                    kind: 'float',
                    value: float.value,
                    digit: 2
                  }
                }
              })
              break
            case AFFErrorType.NonZeroBPMNonZeroBeats: // Default to 4 beats
              patches.push({
                start: error.location.startOffset,
                end: error.location.endOffset,
                replace: (float: AFFFloat): AFFFloat => {
                  return {
                    kind: 'float',
                    value: 4,
                    digit: 2
                  }
                }
              })
              break
            case AFFErrorType.ZeroBPMZeroBeats:
              patches.push({
                start: error.location.startOffset,
                end: error.location.endOffset,
                replace: (float: AFFFloat): AFFFloat => {
                  return {
                    kind: 'float',
                    value: 0,
                    digit: 2
                  }
                }
              })
              break
            case AFFErrorType.ArcZeroDurationSType:
              patches.push({
                start: error.location.startOffset,
                end: error.location.endOffset,
                replace: (arc: AFFArcKind): AFFArcKind => {
                  return {
                    ...arc,
                    value: 's'
                  }
                }
              })
              break
            case AFFErrorType.ArcArctapNotSolid:
              patches.push({
                start: error.location.startOffset,
                end: error.location.endOffset,
                replace: (bool: AFFBool): AFFBool => {
                  return {
                    ...bool,
                    value: false
                  }
                }
              })
              break
          }
        }
      }
      const toScript = new ToScript(patches)
      const fixedContent = toScript.readFile(ast)
      await writeFile(file, fixedContent)
    }
    const content = await readFile(file, 'utf-8')
    const [errors] = checkAFF(content)
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
        chalkColor.bold(level + ':') +
          ` ${file}:${error.location.startLine}:${error.location.startColumn} ${error.message}`
      )
    }
  }
}

main(args.input, args.flags)
