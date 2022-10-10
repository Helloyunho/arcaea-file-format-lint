import { AFFLexer } from './lexer'
import { affParser } from './parser'
import { affToAST } from './to-ast'
import { AFFError, AFFErrorLevel } from './types'
import { processCheckers } from './checkers'

export const checkAFF = (content: string): AFFError[] => {
  const lexingResult = AFFLexer.tokenize(content)
  let errors: AFFError[] = []
  if (lexingResult.errors.length > 0) {
    errors = errors.concat(
      lexingResult.errors.map((e) => ({
        severity: AFFErrorLevel.Error,
        message: e.message,
        location: {
          startOffset: e.offset,
          startLine: e.line,
          startColumn: e.column,
          endOffset: e.offset + e.length,
          endLine: e.line,
          endColumn: e.column + e.length
        }
      }))
    )
  }

  // The error tokens is just ignored so we can find more errors in parsing stage
  affParser.input = lexingResult.tokens
  const parsingResult = affParser.aff()
  if (affParser.errors.length > 0) {
    errors = errors.concat(
      affParser.errors.map((e) => ({
        severity: AFFErrorLevel.Error,
        message: e.message,
        location: {
          startOffset: e.token.startOffset,
          startLine: e.token.startLine,
          startColumn: e.token.startColumn,
          endOffset: e.token.endOffset,
          endLine: e.token.endLine,
          endColumn: e.token.endColumn
        }
      }))
    )
  } else {
    const astResult = affToAST(parsingResult)
    errors = errors.concat(astResult.errors)
    const checkerErrors = processCheckers(astResult.ast)
    errors = errors.concat(checkerErrors)
  }
  return errors
}
