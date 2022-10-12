import {
  AFFArcEvent,
  AFFArcKind,
  AFFArctapEvent,
  AFFBool,
  AFFCameraEvent,
  AFFCameraKind,
  AFFColorId,
  AFFEffect,
  AFFEvent,
  AFFFile,
  AFFFloat,
  AFFHoldEvent,
  AFFInt,
  AFFItem,
  AFFMetadata,
  AFFMetadataEntry,
  AFFNestableItem,
  AFFSceneControlEvent,
  AFFSceneControlKind,
  AFFTapEvent,
  AFFTimingEvent,
  AFFTimingGroupEvent,
  AFFTimingGroupKind,
  AFFTrackId,
  AFFTrackItem,
  AFFValue,
  AFFWord,
  WithLocation
} from './types'

export class ToScript {
  fixOffsets: {
    start: number
    end: number
    delete?: boolean
    replace?: any
  }[]

  constructor(
    fixOffsets?: {
      start: number
      end: number
      delete?: boolean
      replace?: any
    }[]
  ) {
    this.fixOffsets = fixOffsets ?? []
  }

  checkPatch<T>(patch: WithLocation<T>, error: true): T
  checkPatch<T>(patch: WithLocation<T>, error: false): T | undefined
  checkPatch<T>(patch: WithLocation<T>): T | undefined
  checkPatch<T>(patch: WithLocation<T>, error: boolean = false): T | undefined {
    const { startOffset, endOffset } = patch.location
    const fix = this.fixOffsets.find(
      (fix) => fix.start === startOffset && fix.end === endOffset
    )
    if (fix) {
      if (fix.delete) {
        if (error) {
          throw new Error(`Unexpected delete patch: ${patch}`)
        } else {
          return undefined
        }
      } else {
        const result = fix.replace
        const recursiveFix = (obj: any, orig: any) => {
          if (obj instanceof Array) {
            obj = obj.map((item, i) => recursiveFix(item, orig[i]))
          }
          if (typeof obj === 'object') {
            for (const key in obj) {
              if (obj[key] instanceof Array) {
                obj[key] = obj[key].map((item: any) => {
                  return recursiveFix(item, orig[key])
                })
              } else if (typeof obj[key] === 'object') {
                obj[key] = recursiveFix(obj[key], orig[key])
              } else if (typeof obj[key] === 'function') {
                obj[key] = obj[key](orig[key])
              } else if (obj[key] !== undefined) {
                obj[key] = obj[key]
              } else {
                obj[key] = orig[key]
              }
            }
          } else if (typeof obj === 'function') {
            obj = obj(orig)
          }
          return obj
        }
        const value = recursiveFix(result, patch.data)
        return value
      }
    }
    return patch.data
  }

  readFile(ast: AFFFile) {
    const metadata = this.readMetadata(this.checkPatch(ast.metadata))
    const items = []
    for (const item of ast.items) {
      const patched = this.checkPatch(item)
      if (patched) {
        items.push(this.readItem(patched))
      }
    }
    return `${metadata}\n-\n${items.join('\n')}`
  }

  readMetadata(metadata: AFFMetadata) {
    const entries = []
    for (const entry of metadata.data.values()) {
      const patched = this.checkPatch(entry)
      if (patched) {
        entries.push(this.readMetadataEntry(patched))
      }
    }
    return `${entries.join('\n')}`
  }

  readMetadataEntry(entry: AFFMetadataEntry) {
    const key = this.checkPatch(entry.key, true)
    const value = this.checkPatch(entry.value, true)
    return `${key}:${value}`
  }

  readTrackItem(item: AFFTrackItem) {
    if (item.kind === 'tap') {
      return this.readTap(item as AFFTapEvent)
    } else if (item.kind === 'hold') {
      return this.readHold(item as AFFHoldEvent)
    } else {
      throw new Error(`Unknown item kind: ${item}`)
    }
  }

  readNestableItem(item: AFFNestableItem) {
    if (item.kind === 'timing') {
      return this.readTiming(item as AFFTimingEvent)
    } else if (item.kind === 'arc') {
      return this.readArc(item as AFFArcEvent)
    } else if (item.kind === 'camera') {
      return this.readCamera(item as AFFCameraEvent)
    } else if (item.kind === 'scenecontrol') {
      return this.readSceneControl(item as AFFSceneControlEvent)
    } else {
      return this.readTrackItem(item as AFFTrackItem)
    }
  }

  readItem(item: AFFItem) {
    if (item.kind === 'timinggroup') {
      return this.readTimingGroup(item as AFFTimingGroupEvent)
    } else {
      return this.readNestableItem(item as AFFNestableItem)
    }
  }

  readEvent(event: AFFEvent) {
    if (event.kind === 'arctap') {
      return this.readArctap(event as AFFArctapEvent)
    } else {
      return this.readItem(event as AFFItem)
    }
  }

  readTiming(timing: AFFTimingEvent) {
    const time = this.readInt(this.checkPatch(timing.time, true))
    const bpm = this.readFloat(this.checkPatch(timing.bpm, true))
    const measure = this.readFloat(this.checkPatch(timing.measure, true))
    return `timing(${time},${bpm},${measure});`
  }

  readInt(int: AFFInt) {
    return int.value.toString()
  }

  readFloat(float: AFFFloat) {
    const negative = float.value < 0
    const integer = Math.abs(Math.trunc(float.value))
    const decimal = Math.trunc(
      (Math.abs(float.value) - integer) * 10 ** float.digit
    )
    return `${negative ? '-' : ''}${integer}.${decimal
      .toString()
      .padStart(float.digit, '0')}`
  }

  readWord(word: AFFWord) {
    return word.value
  }

  readTap(tap: AFFTapEvent) {
    const time = this.readInt(this.checkPatch(tap.time, true))
    const trackId = this.readTrackID(this.checkPatch(tap.trackId, true))
    return `(${time},${trackId});`
  }

  readHold(hold: AFFHoldEvent) {
    const start = this.readInt(this.checkPatch(hold.start, true))
    const end = this.readInt(this.checkPatch(hold.end, true))
    const trackId = this.readTrackID(this.checkPatch(hold.trackId, true))
    return `hold(${start},${end},${trackId});`
  }

  readArc(arc: AFFArcEvent) {
    const start = this.readInt(this.checkPatch(arc.start, true))
    const end = this.readInt(this.checkPatch(arc.end, true))
    const xStart = this.readFloat(this.checkPatch(arc.xStart, true))
    const xEnd = this.readFloat(this.checkPatch(arc.xEnd, true))
    const arcKind = this.readArcKind(this.checkPatch(arc.arcKind, true))
    const yStart = this.readFloat(this.checkPatch(arc.yStart, true))
    const yEnd = this.readFloat(this.checkPatch(arc.yEnd, true))
    const colorId = this.readColorID(this.checkPatch(arc.colorId, true))
    const effect = this.readEffect(this.checkPatch(arc.effect, true))
    const isLine = this.readBool(this.checkPatch(arc.isLine, true))
    const arctaps = []
    if (arc.arctaps) {
      for (const arctap of this.checkPatch(arc.arctaps)) {
        const patched = this.checkPatch(arctap)
        if (patched) {
          arctaps.push(this.readArctap(patched))
        }
      }
    }
    return `arc(${start},${end},${xStart},${xEnd},${arcKind},${yStart},${yEnd},${colorId},${effect},${isLine})${
      arctaps.length !== 0 ? `[${arctaps.join(',')}]` : ''
    };`
  }

  readTrackID(trackId: AFFTrackId) {
    return trackId.value.toString()
  }

  readArcKind(arcKind: AFFArcKind) {
    return arcKind.value
  }

  readColorID(colorId: AFFColorId) {
    return colorId.value.toString()
  }

  readEffect(effect: AFFEffect) {
    return effect.value
  }

  readBool(bool: AFFBool) {
    return bool.value ? 'true' : 'false'
  }

  readArctap(arctap: AFFArctapEvent) {
    const time = this.readInt(this.checkPatch(arctap.time, true))
    return `arctap(${time})`
  }

  readCamera(camera: AFFCameraEvent) {
    const time = this.readInt(this.checkPatch(camera.time, true))
    const translationX = this.readFloat(
      this.checkPatch(camera.translationX, true)
    )
    const translationY = this.readFloat(
      this.checkPatch(camera.translationY, true)
    )
    const translationZ = this.readFloat(
      this.checkPatch(camera.translationZ, true)
    )
    const rotationX = this.readFloat(this.checkPatch(camera.rotationX, true))
    const rotationY = this.readFloat(this.checkPatch(camera.rotationY, true))
    const rotationZ = this.readFloat(this.checkPatch(camera.rotationZ, true))
    const cameraKind = this.readCameraKind(
      this.checkPatch(camera.cameraKind, true)
    )
    const duration = this.readInt(this.checkPatch(camera.duration, true))
    return `camera(${time},${translationX},${translationY},${translationZ},${rotationX},${rotationY},${rotationZ},${cameraKind},${duration});`
  }

  readCameraKind(cameraKind: AFFCameraKind) {
    return cameraKind.value
  }

  readValue(value: AFFValue) {
    if (value.kind === 'int') {
      return this.readInt(value)
    } else if (value.kind === 'float') {
      return this.readFloat(value)
    } else if (value.kind === 'word') {
      return this.readWord(value)
    } else {
      throw new Error(`Unknown value kind: ${value}`)
    }
  }

  readSceneControl(sceneControl: AFFSceneControlEvent) {
    const time = this.readInt(this.checkPatch(sceneControl.time, true))
    const sceneControlKind = this.readSceneControlKind(
      this.checkPatch(sceneControl.sceneControlKind, true)
    )
    const values = []
    for (const value of this.checkPatch(sceneControl.values)) {
      const patched = this.checkPatch(value)
      if (patched) {
        values.push(this.readValue(patched))
      }
    }
    return `scenecontrol(${time},${sceneControlKind},${values.join(',')});`
  }

  readSceneControlKind(sceneControlKind: AFFSceneControlKind) {
    return sceneControlKind.value
  }

  readTimingGroup(timingGroup: AFFTimingGroupEvent) {
    const timingGroupAttribute = this.readTimingGroupKind(
      this.checkPatch(timingGroup.timingGroupAttribute, true)
    )
    const items = []
    for (const item of this.checkPatch(timingGroup.items)) {
      const patched = this.checkPatch(item)
      if (patched) {
        items.push(this.readNestableItem(patched))
      }
    }
    return `timinggroup(${timingGroupAttribute})[${items.join(',')}]`
  }

  readTimingGroupKind(timingGroupKind: AFFTimingGroupKind) {
    return timingGroupKind.value
  }
}
