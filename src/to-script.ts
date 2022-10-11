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

  readFile(ast: AFFFile) {
    const metadata = this.readMetadata(this.removeLocation(ast.metadata))
    const items = ast.items.map((item) =>
      this.readItem(this.removeLocation(item))
    )
    return `${metadata}\n-\n${items.join('\n')}`
  }

  removeLocation<T>(node: WithLocation<T>): T {
    return node.data
  }

  readMetadata(metadata: AFFMetadata) {
    const entries = Array.from(metadata.data.values()).map((entry) =>
      this.readMetadataEntry(this.removeLocation(entry))
    )
    return `${entries.join('\n')}`
  }

  readMetadataEntry(entry: AFFMetadataEntry) {
    return `${entry.key.data}:${entry.value.data}`
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
    const time = this.readInt(this.removeLocation(timing.time))
    const bpm = this.readFloat(this.removeLocation(timing.bpm))
    const measure = this.readFloat(this.removeLocation(timing.measure))
    return `timing(${time},${bpm},${measure});`
  }

  readInt(int: AFFInt) {
    return int.value.toString()
  }

  readFloat(float: AFFFloat) {
    return `${float.value}.${float.digit}`
  }

  readWord(word: AFFWord) {
    return word.value
  }

  readTap(tap: AFFTapEvent) {
    const time = this.readInt(this.removeLocation(tap.time))
    const trackId = this.readTrackID(this.removeLocation(tap.trackId))
    return `(${time},${trackId});`
  }

  readHold(hold: AFFHoldEvent) {
    const start = this.readInt(this.removeLocation(hold.start))
    const end = this.readInt(this.removeLocation(hold.end))
    const trackId = this.readTrackID(this.removeLocation(hold.trackId))
    return `hold(${start},${end},${trackId});`
  }

  readArc(arc: AFFArcEvent) {
    const start = this.readInt(this.removeLocation(arc.start))
    const end = this.readInt(this.removeLocation(arc.end))
    const xStart = this.readFloat(this.removeLocation(arc.xStart))
    const xEnd = this.readFloat(this.removeLocation(arc.xEnd))
    const arcKind = this.readArcKind(this.removeLocation(arc.arcKind))
    const yStart = this.readFloat(this.removeLocation(arc.yStart))
    const yEnd = this.readFloat(this.removeLocation(arc.yEnd))
    const colorId = this.readColorID(this.removeLocation(arc.colorId))
    const effect = this.readEffect(this.removeLocation(arc.effect))
    const isLine = this.readBool(this.removeLocation(arc.isLine))
    const arctaps = arc.arctaps
      ? this.removeLocation(arc.arctaps).map((arctap) =>
          this.readArctap(this.removeLocation(arctap))
        )
      : undefined
    return `arc(${start},${end},${xStart},${xEnd},${arcKind},${yStart},${yEnd},${colorId},${effect},${isLine})${
      arctaps !== undefined ? `[${arctaps.join(',')}]` : ''
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
    const time = this.readInt(this.removeLocation(arctap.time))
    return `arctap(${time})`
  }

  readCamera(camera: AFFCameraEvent) {
    const time = this.readInt(this.removeLocation(camera.time))
    const translationX = this.readFloat(
      this.removeLocation(camera.translationX)
    )
    const translationY = this.readFloat(
      this.removeLocation(camera.translationY)
    )
    const translationZ = this.readFloat(
      this.removeLocation(camera.translationZ)
    )
    const rotationX = this.readFloat(this.removeLocation(camera.rotationX))
    const rotationY = this.readFloat(this.removeLocation(camera.rotationY))
    const rotationZ = this.readFloat(this.removeLocation(camera.rotationZ))
    const cameraKind = this.readCameraKind(
      this.removeLocation(camera.cameraKind)
    )
    const duration = this.readInt(this.removeLocation(camera.duration))
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
    const time = this.readInt(this.removeLocation(sceneControl.time))
    const sceneControlKind = this.readSceneControlKind(
      this.removeLocation(sceneControl.sceneControlKind)
    )
    const values = this.removeLocation(sceneControl.values).map((value) =>
      this.readValue(this.removeLocation(value))
    )
    return `scenecontrol(${time},${sceneControlKind},${values.join(',')});`
  }

  readSceneControlKind(sceneControlKind: AFFSceneControlKind) {
    return sceneControlKind.value
  }

  readTimingGroup(timingGroup: AFFTimingGroupEvent) {
    const timingGroupAttribute = this.readTimingGroupKind(
      this.removeLocation(timingGroup.timingGroupAttribute)
    )
    const items = this.removeLocation(timingGroup.items).map((item) =>
      this.readNestableItem(this.removeLocation(item))
    )
    return `timinggroup(${timingGroupAttribute})[${items.join(',')}]`
  }

  readTimingGroupKind(timingGroupKind: AFFTimingGroupKind) {
    return timingGroupKind.value
  }
}
