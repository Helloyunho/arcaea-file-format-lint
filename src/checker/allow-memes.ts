import { AFFChecker } from '../types.js'
import { allowMemes } from '../associated-data/allow-memes.js'

export const allowMemesChecker: AFFChecker = (file, error) => {
  error.splice(error.length, 0, ...allowMemes.get(file).errors)
}
