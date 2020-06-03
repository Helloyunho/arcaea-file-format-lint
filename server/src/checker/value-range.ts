import { DiagnosticSeverity } from "vscode-languageserver"
import { AFFChecker, AFFInt, AFFError, WithLocation, AFFItem } from "../types"

export const valueRangeChecker: AFFChecker = (file, errors) => {
	for (const item of file.items) {
		checkItem(item, errors)
	}
}

const checkItem = ({ data, location }: WithLocation<AFFItem>, errors: AFFError[]) => {
	if (data.kind === "timing") {
		checkTimestamp(data.time, errors)
		if (data.bpm.data.value !== 0 && data.measure.data.value === 0) {
			errors.push({
				message: `Timing event with non-zero bpm should not have zero beats per segment.`,
				severity: DiagnosticSeverity.Error,
				location: data.measure.location,
			})
		}
		if (data.bpm.data.value === 0 && data.measure.data.value !== 0) {
			errors.push({
				message: `Timing event with zero bpm should have zero beats per segment.`,
				severity: DiagnosticSeverity.Information,
				location: data.measure.location,
			})
		}
	} else if (data.kind === "tap") {
		checkTimestamp(data.time, errors)
	} else if (data.kind === "hold") {
		checkTimestamp(data.start, errors)
		checkTimestamp(data.end, errors)
		if (data.start.data.value >= data.end.data.value) {
			errors.push({
				message: `Hold event should have a positive time length.`,
				severity: DiagnosticSeverity.Error,
				location: location,
			})
		}
	} else if (data.kind === "arc") {
		checkTimestamp(data.start, errors)
		checkTimestamp(data.end, errors)
		if (data.start.data.value > data.end.data.value) {
			errors.push({
				message: `Arc event should have a non-negative time length.`,
				severity: DiagnosticSeverity.Error,
				location: location,
			})
		}
		if (data.start.data.value === data.end.data.value) {
			if (data.xStart.data.value === data.xEnd.data.value && data.yStart.data.value === data.yEnd.data.value) {
				errors.push({
					message: `Arc event with zero time length should have different start point and end point.`,
					severity: DiagnosticSeverity.Error,
					location: location,
				})
			}
			if (data.arcKind.data.value !== "s") {
				errors.push({
					message: `Arc event with zero time length should be "s" type.`,
					severity: DiagnosticSeverity.Information,
					location: data.arcKind.location,
				})
			}
			if (data.arctaps) {
				errors.push({
					message: `Arc event with zero time length should not have arctap events on it.`,
					severity: DiagnosticSeverity.Error,
					location: data.arctaps.location,
				})
			}
		}
		if (data.effect.data.value !== "none") {
			errors.push({
				message: `Arc event with effect other than "none" should not be used.`,
				severity: DiagnosticSeverity.Warning,
				location: data.effect.location,
			})
		}
		if (!data.isLine.data.value && data.arctaps) {
			errors.push({
				message: `Arc event with arctap events on it will be treated as not solid even it is specified as solid.`,
				severity: DiagnosticSeverity.Warning,
				location: data.isLine.location,
			})
		}
		if (data.arctaps) {
			for (const arctap of data.arctaps.data) {
				if (arctap.data.time.data.value < data.start.data.value || arctap.data.time.data.value > data.end.data.value) {
					errors.push({
						message: `Arctap event should happens in the time range of parent arc event.`,
						severity: DiagnosticSeverity.Error,
						location: arctap.location,
					})
				}
			}
		}
	} else if (data.kind === "camera") {
		if (data.duration.data.value < 0) {
			errors.push({
				message: `Camera event should have non negative duration.`,
				severity: DiagnosticSeverity.Error,
				location: data.duration.location,
			})
		}
	} else if (data.kind === "timinggroup") {
		for (const item of data.items.data) {
			checkItem(item, errors)
		}
	}
}

const checkTimestamp = (timestamp: WithLocation<AFFInt>, errors: AFFError[]) => {
	if (timestamp.data.value < 0) {
		errors.push({
			message: `Timestamp should not be nagetive.`,
			severity: DiagnosticSeverity.Error,
			location: timestamp.location,
		})
	}
}