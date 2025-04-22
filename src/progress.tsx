import {createEffect, createSignal, For, Show} from "solid-js"
import "./progress.css"

export default function Progress(props: {
	score: number
	levelNames: string[]
	levelValues: number[]
	high: number
}) {
	const progressIndex = () => {
		return props.levelValues.filter(v => v <= props.score).length - 1
	}
	const levelName = () => props.levelNames[progressIndex() ?? 0]
	const percent = () =>
		[0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100][progressIndex() ?? 0]

	const [showing, setShowing] = createSignal(-1)

	const [bloom, setBloom] = createSignal(false)

	createEffect(() => {
		if (props.score) {
			setBloom(true)
			setTimeout(() => {
				setBloom(false)
			}, 150)
		}
	})

	return (
		<div class="progress">
			<h4 class="rank">{levelName()}</h4>
			<div class="bar">
				<div class="line">
					<div class="dots">
						<For each={props.levelNames}>
							{(name, index) => {
								return (
									<button
										class="dot"
										onClick={event => {
											setShowing(index())
											setTimeout(() => {
												setShowing(-1)
											}, 100)
											event.target.blur()
										}}>
										<span
											classList={{
												info: true,
												show: showing() === index(),
											}}>
											{name} ({props.levelValues[index()]})
										</span>
									</button>
								)
							}}
						</For>
					</div>
				</div>
				<div
					classList={{
						marker: true,
						bloom: bloom(),
					}}
					style={{left: `${percent()}%`}}>
					<span class="score">{props.score}</span>
				</div>
			</div>
			<Show when={percent() == 100}>
				<div style={{"white-space": "nowrap", "font-size": "12px"}}>
					(max: {props.high})
				</div>
			</Show>
		</div>
	)
}
