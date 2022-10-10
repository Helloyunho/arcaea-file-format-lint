import { AFFChecker } from '../types.js'
import { enwidens } from '../associated-data/enwiden.js'

export const enwidenChecker: AFFChecker = (file, error) => {
  error.splice(error.length, 0, ...enwidens.get(file).errors)
}
