import {
	createEffect,
	createSignal,
	For,
	onCleanup,
	Show,
	Suspense,
	untrack,
} from "solid-js"
import "./app.css"
import {useKeyDownEvent} from "@solid-primitives/keyboard"
import {isValidAutomergeUrl} from "@automerge/automerge-repo"
import repo from "../../repo/export.ts"
import {z} from "zod"
import {useDocument} from "solid-automerge"
import {createMutable, createStore} from "solid-js/store"
// thanks to ConorSheehan1 for these words
import games from "../../words/games.json"
import toast, {Toaster, type ToastOptions} from "solid-toast"
import confetti from "canvas-confetti"

const confettiConfig = {
	spread: 360,
	ticks: 50,
	gravity: 0,
	decay: 0.94,
	startVelocity: 30,
}

function celebrate(
	colors: string[] = ["FFE400", "FFBD00", "E89400", "ff7faa", "ffec1a"]
) {
	confetti({
		...confettiConfig,
		particleCount: 40,
		scalar: 1.2,
		shapes: ["star"],
		colors,
	})

	confetti({
		...confettiConfig,
		particleCount: 10,
		scalar: 0.75,
		shapes: ["circle"],
		colors,
	})
}

const levelNames = [
	"beginner",
	"ok let's go",
	"now we're talking",
	"v nice",
	"pretty cool",
	"sick",
	"yay!",
	"omg!!",
	"wow!! you're amazing",
]

function int() {
	const a = new Uint32Array(1)
	window.crypto.getRandomValues(a)
	return a[0]
}

const GameState = z.object({
	found: z.string().array().default([]),
	game: z
		.number()
		.default(() => Math.floor(lerp(0, gamesLength - 1, int() / 0xffffffff))),
	over: z.boolean().default(false),
})

function lerp(a: number, b: number, t: number) {
	return a + (b - a) * t
}

const gamesLength = games.length

type GameState = z.infer<typeof GameState>

function createInitialState(): GameState {
	return GameState.parse({})
}

function isPangram(word: string) {
	return new Set(word).size == 7
}

function scoreWord(word: string): number {
	if (word.length === 4) return 1
	if (isPangram(word)) return word.length + 7
	return word.length
}

function inkedup(items: number[]): number[] {
	const seen = new Set()
	return items.map(num => {
		while (seen.has(num)) {
			num += 1
		}
		seen.add(num)
		return num
	})
}

type SingleGame = (typeof games)[number]

function getLevels(game: SingleGame): Array<number> {
	let levels = [
		0,
		5,
		Math.floor(game.high * 0.1),
		Math.floor(game.high * 0.2),
		Math.floor(game.high * 0.3),
		Math.floor(game.high * 0.4),
		Math.floor(game.high * 0.5),
		Math.floor(game.high * 0.55),
		Math.floor(game.high * 0.6),
	].sort((a, b) => a - b)
	levels = inkedup(levels)
	const min = Math.min(...levels)
	return levels.map((l: number) => l - min)
}

interface LocalState {
	guess: string
	name: string
}

let name = localStorage.getItem("name")

while (!name) {
	name = prompt("what's your name?")
}
localStorage.setItem("name", name)

const local: LocalState = createMutable({
	guess: "",
	name,
})

type RemoteState = {
	[name: string]: {guess: string; letter: string; name: string}
}

const remote: RemoteState = createMutable({})

function favicon(kind: "default" | "typing" = "default") {
	// Ensure we have access to the document, i.e. we are in the browser.
	if (typeof window === "undefined") return

	const link: HTMLLinkElement =
		window.document.querySelector("link[rel*='icon']") ||
		window.document.createElement("link")
	link.type = "image/svg+xml"
	link.rel = "shortcut icon"
	if (kind === "default") {
		link.href = `/favicon.svg`
	} else {
		link.href = `/favicon.${kind}.svg`
	}

	window.document.getElementsByTagName("head")[0].appendChild(link)
}

export default function App() {
	const [gameState, gameHandle] = useDocument<GameState>(
		() => {
			const hash = location.hash.slice(1)
			if (isValidAutomergeUrl(hash)) {
				return hash
			}
			const url = repo.create(createInitialState()).url
			location.hash = url
			return url
		},
		{repo}
	)

	const [particlesReady, setParticlesReady] = createSignal(false)

	function notify(msg: string, opts: ToastOptions = {}) {
		toast(msg, {
			duration: 1200,
			position: "top-center",
			...opts,
		})
	}

	const game = () => gameState() && games[gameState()!.game]

	enum GuessResult {
		Early = "early",
		Seen = "seen",
		Small = "small",
		Absent = "absent",
		Without = "without",
		Bad = "bad",
		Success = "success",
	}

	function check(guess: string) {
		if (!game() || !gameState()) {
			return GuessResult.Early
		}
		if (!new Set(game()!.edge + game()!.centre).isSupersetOf(new Set(guess))) {
			return GuessResult.Bad
		}
		if (gameState()?.found?.includes(guess)) {
			return GuessResult.Seen
		}
		if (guess.length < 4) {
			return GuessResult.Small
		}
		if (guess.includes(game()!.centre) === false) {
			return GuessResult.Without
		}
		if (!game()!.answers.includes(guess)) {
			return GuessResult.Absent
		}
		return GuessResult.Success
	}

	const keydown = useKeyDownEvent()
	function onkeyup(event: KeyboardEvent) {
		event.preventDefault()
		event.stopPropagation()
		event.stopImmediatePropagation()
		if (event.key == "Enter") {
			guess()
		}
	}
	window.addEventListener("keyup", onkeyup)
	onCleanup(() => {
		window.removeEventListener("keyup", onkeyup)
	})

	const canBeInserted = (key: string) => {
		if (key.length !== 1) return false
		if (!game()) return false
		return /^[a-z]$/.test(key)
	}

	const [localLetter, setLocalLetter] = createSignal("")
	createEffect(() => {
		if (localLetter() === "") return
		gameHandle()?.broadcast({letter: localLetter(), name})
		setTimeout(() => setLocalLetter(""), 200)
	})

	function insert(letter: string) {
		if (!canBeInserted(letter)) return
		local.guess += letter
		setLocalLetter(letter)

		if (local.guess.length > 20) {
			notify("too big")
			local.guess = ""
		}
	}

	function guess() {
		gameHandle()?.broadcast({guess: local.guess})
		if (!game()) return
		const guess = local.guess
		local.guess = ""
		if (guess.length == 0) return
		const result = check(guess)
		if (result === GuessResult.Early) {
			notify("game not started yet")
		} else if (result == GuessResult.Bad) {
			notify("bad letters", {icon: "🙊"})
		} else if (result === GuessResult.Seen) {
			notify("already guessed!", {icon: "😳"})
		} else if (result === GuessResult.Small) {
			notify("too small", {icon: "🙊"})
		} else if (result == GuessResult.Without) {
			notify("where's the centre letter mate?", {icon: "🙉"})
		} else if (result === GuessResult.Absent) {
			notify("not in word list, sorry :c", {icon: "🙈"})
		} else if (result === GuessResult.Success) {
			const score = scoreWord(guess)
			if (isPangram(guess)) {
				notify("PANGRAM!!! " + score + " points", {icon: "🤩"})
				setTimeout(celebrate)
				setTimeout(celebrate, 100)
				setTimeout(celebrate, 200)
			} else if (guess.length > 7) {
				notify("yummy! " + score + " points", {icon: "😋"})
			} else if (guess.length > 4) {
				notify("nice! " + score + " points", {icon: "😊"})
			} else if (score == 1) {
				notify("1 point", {icon: "😃"})
			} else {
				notify("nice. " + score + " points", {icon: "😌"})
			}
			gameHandle()?.change(state => {
				state.found.push(guess)
				state.found = Array.from(new Set(state.found))
			})
		}
	}

	createEffect(() => {
		const event = keydown()
		if (!event) return
		/* no mod keys */
		if (event.altKey || event.ctrlKey || event.metaKey) return
		const key = event.key.toLowerCase()

		if (key === "backspace") {
			untrack(() => (local.guess = local.guess.slice(0, -1)))
		} else if (canBeInserted(key)) {
			untrack(() => insert(key))
		}
	})

	createEffect(() => {
		gameHandle()?.broadcast({
			guess: local.guess,
			name,
		})
	})

	let isTypingTimeout = setTimeout(() => {}, 0)

	createEffect(() => {
		function handleMessage({
			message,
		}: {
			message: {letter?: string; guess?: string; name: string}
		}) {
			if (message.letter != null) {
				const prior = remote[message.name]
				remote[message.name] = {
					letter: message.letter,
					name: message.name,
					guess: prior?.guess ?? "",
				}
				setTimeout(() => {
					remote[message.name].letter = ""
				}, 200)

				clearTimeout(isTypingTimeout)
				document.title = `${message.name} is typing...`
				favicon("typing")
				isTypingTimeout = setTimeout(() => {
					document.title = "spelltogether"
					favicon("default")
				}, 300)
				return
			}
			if (message.guess != null) {
				const prior = remote[message.name]
				remote[message.name] = {
					letter: prior?.letter ?? "",
					name: message.name,
					guess: message.guess,
				}
				return
			}
			if (message.name != null) {
				remote[message.name] = {
					letter: "",
					name: message.name,
					guess: "",
				}
			}
		}
		gameHandle()?.on("ephemeral-message", handleMessage)
		onCleanup(() => {
			gameHandle()?.off("ephemeral-message", handleMessage)
		})
	})

	const score = () =>
		gameState()?.found?.reduce((score, word) => score + scoreWord(word), 0) ?? 0

	const [edge, setEdge] = createSignal(game()?.edge.split("") || [])
	createEffect(() => {
		setEdge(game()?.edge?.split("") || [])
	})
	const centre = () => game()?.centre

	function shuffle() {
		setEdge(edge()?.toSorted(() => Math.random() - 0.5))
	}

	const letters = () => {
		return [
			centre(),
			edge()[0],
			edge()[1],
			edge()[2],
			edge()[3],
			edge()[4],
			edge()[5],
		] as string[]
	}

	const isRemoteLetter = (letter: string) => {
		return Object.values(remote)
			.map(remote => remote.letter)
			.filter(letter => letter !== "")
			.includes(letter)
	}

	function Guess(props: {guess: string; name: string}) {
		return (
			<kbd
				classList={{
					guess: true,
					local: props.name === local.name,
					remote: props.name !== local.name,
				}}>
				<For each={props.guess.split("")}>
					{letter => {
						return (
							<span
								classList={{
									guessletter: true,
									centre: letter === centre(),
									bad: !letters().includes(letter),
								}}>
								{letter}
							</span>
						)
					}}
				</For>{" "}
				<span class="guesser">{props.name}</span>
			</kbd>
		)
	}

	const levels = () => game() && getLevels(game()!)

	return (
		<main>
			<h1>spelling chee & spelling zee</h1>

			<Show when={game() && gameState()}>
				<Show when={levels()}>
					<Progress
						score={score()}
						levelValues={levels()!}
						levelNames={levelNames}
						high={game()!.high}
					/>
				</Show>
				<Show when={gameState()!.over}>
					<div class="game-over">
						<small style={{display: "none"}}>#{gameState()!.game}</small>
						<p>
							the highest possible score was <strong>{game()!.high}</strong>.
							you got <strong>{score()}</strong>.
						</p>

						<div class="answers">
							<For each={game()?.answers}>
								{answer => {
									return (
										<div
											classList={{
												answer: true,
												got: gameState()!.found.includes(answer),
											}}>
											{answer}
										</div>
									)
								}}
							</For>
						</div>
						<p>
							<a href="/" style={{color: "var(--blue-crayola)"}}>
								start new game
							</a>
						</p>
					</div>
				</Show>
				<Show when={!gameState()!.over}>
					<div class="guessers">
						<Guess guess={local.guess} name={local.name} />

						<For each={Object.values(remote)}>
							{remote => (
								<Show when={remote.name}>
									<Guess guess={remote.guess} name={remote.name} />
								</Show>
							)}
						</For>
					</div>
					<div class="letters">
						<For each={letters()}>
							{(letter, index) => (
								<span
									onClick={event => {
										insert(letter)
										event.target.blur()
									}}
									classList={{
										letter: true,
										centre: letter === centre(),
										remote: isRemoteLetter(letter!),
										local: letter === localLetter(),
										["letter-" + index()]: true,
									}}>
									<svg viewBox="0 0 120 104">
										<polygon
											class="hexagon remote"
											points="0,52 30,0 90,0 120,52 90,104 30,104"></polygon>

										<polygon
											class="hexagon local"
											points="4,52 32.4,4 87.6,4 116,52 87.6,100 32.4,100"></polygon>

										<polygon
											class="hexagon inner"
											points="8,52 34.8,8 85.2,8 112,52 85.2,96 34.8,96"></polygon>

										<text class="cell-letter" x="50" y="25" dy="1em">
											{letter}
										</text>
									</svg>
								</span>
							)}
						</For>
					</div>

					<div class="buttons">
						<button
							onClick={event => {
								local.guess = local.guess.slice(0, -1)
								event.target.blur()
							}}>
							backspace
						</button>
						<button
							onclick={event => {
								shuffle()
								event.target.blur()
							}}>
							shuffle
						</button>
						<button
							onClick={event => {
								guess()
								event.target.blur()
							}}>
							guess
						</button>
					</div>

					<details onClick={event => event.target.blur()}>
						<summary>found</summary>
						<ul class="found">
							<Show when={gameState()?.found?.length === 0}>
								You haven't found a single word yet. Better get started!
							</Show>
							<For each={gameState()?.found?.toReversed()}>
								{word => (
									<li>
										<span
											classList={{
												"found-pangram-marker": true,
												show: isPangram(word),
											}}>
											✨
										</span>
										<span class="found-score">{scoreWord(word)}</span>
										<span class="found-word">{word}</span>
									</li>
								)}
							</For>
						</ul>
					</details>

					<button
						class="give-up"
						onClick={event => {
							const sure = confirm(
								"are you sure? this will end the game forever for everyone!"
							)
							if (sure) {
								gameHandle()?.change(state => {
									state.over = true
								})
							}
							event.target.blur()
						}}>
						give up and see answers
					</button>
				</Show>
			</Show>
			<Toaster />
		</main>
	)
}

function Progress(props: {
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

	createEffect(() => {
		if (percent() == 100) {
			celebrate(["33ccff", "ff2a50", "ffff00", "00ffff", "ff00ff"])
		}
		if (props.score == props.high) {
			setTimeout(() => {
				celebrate(["33ccff", "ff2a50", "ffff00", "00ffff", "ff00ff"])
			})
			celebrate()
			setTimeout(celebrate, 250)
			setTimeout(celebrate, 500)
			setTimeout(celebrate, 750)
			setInterval(() => {
				celebrate(["ffff00"])
				celebrate(["33ccff", "ff2a50", "ffff00", "00ffff", "ff00ff"])
				setTimeout(() => celebrate(["ffff00"]), 500)
				setTimeout(() => celebrate(["00ffff"]), 750)
			}, 1000)
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
