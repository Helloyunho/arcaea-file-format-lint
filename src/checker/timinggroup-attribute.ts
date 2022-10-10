import { timings } from '../associated-data/timing.js'
import { AFFChecker, AFFErrorLevel } from '../types.js'

export const timinggroupAttributeChecker: AFFChecker = (file, errors) => {
  for (const { data } of file.items) {
    if (data.kind === 'timinggroup') {
      const attribute = timings.get(data).attributes
      const unknownAttribute = attribute
        .filter((attr) => attr !== 'noinput' && attr !== 'fadingholds')
        .filter((attr) => !/^angle[xy][0-9]+$/.test(attr))
      if (unknownAttribute.length > 0) {
        errors.push({
          message: `Timinggroup event with attribute ${unknownAttribute
            .map((attr) => `"${attr}"`)
            .join(', ')} is not known by us`,
          location: data.timingGroupAttribute.location,
          severity: AFFErrorLevel.Warning
        })
      }
    }
  }
}
