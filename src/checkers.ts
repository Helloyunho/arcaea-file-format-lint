import { allowMemesChecker } from './checker/allow-memes.js'
import { metadataChecker } from './checker/metadata.js'
import { valueRangeChecker } from './checker/value-range.js'
import { floatDigitChecker } from './checker/float-digit.js'
import { timingChecker } from './checker/timing.js'
import { arcPositionChecker } from './checker/arc-position.js'
import { overlapChecker } from './checker/overlap.js'
import { cutByTimingChecker } from './checker/cut-by-timing.js'
import { scenecontrolChecker } from './checker/scenecontrol.js'
import { AFFFile, AFFError } from './types.js'
import { timinggroupAttributeChecker } from './checker/timinggroup-attribute.js'
import { enwidenChecker } from './checker/enwiden.js'
import { extraLanesChecker } from './checker/extra-lanes.js'

const checkers = [
  allowMemesChecker,
  metadataChecker,
  valueRangeChecker,
  floatDigitChecker,
  timingChecker,
  enwidenChecker,
  arcPositionChecker,
  overlapChecker,
  cutByTimingChecker,
  extraLanesChecker,
  scenecontrolChecker,
  timinggroupAttributeChecker
]

export const processCheckers = (file: AFFFile): AFFError[] => {
  let errors: AFFError[] = []
  for (const checker of checkers) {
    checker(file, errors)
  }
  return errors
}
