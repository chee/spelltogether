import {
	createEffect,
	createSignal,
	For,
	onCleanup,
	Show,
	untrack,
} from "solid-js"
import "./app.css"
import {useKeyDownEvent} from "@solid-primitives/keyboard"
import {isValidAutomergeUrl} from "@automerge/automerge-repo"
import repo from "../../repo/export.ts"
import {useDocument} from "solid-automerge"
import {createMutable} from "solid-js/store"
// thanks to ConorSheehan1 for these words
import games from "../../words/games.json"
import toast, {Toaster, type ToastOptions} from "solid-toast"
import {
	celebrate,
	GameState,
	getLevels,
	isPangram,
	levelNames,
	scoreGame,
	scoreWord,
} from "../../lib.ts"
import Progress from "../../progress.tsx"
import {A, useLocation, useNavigate} from "@solidjs/router"

function createInitialState(): GameState {
	return GameState.parse({})
}

interface LocalState {
	guess: string
	name: string
}

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
	const nav = useNavigate()
	let name = localStorage.getItem("name")

	while (!name) {
		name = prompt("what's your name?")
	}
	localStorage.setItem("name", name)

	const loc = useLocation()

	const [gameState, gameHandle] = useDocument<GameState>(
		() => {
			const hash = loc.hash.slice(1)
			if (isValidAutomergeUrl(hash)) {
				return hash
			}
			const url = repo.create(createInitialState()).url
			nav("/play/#" + url)
			return url
		},
		{repo}
	)

	const local: LocalState = createMutable({
		guess: "",
		name,
	})

	type RemoteState = {
		[name: string]: {guess: string; letter: string; name: string}
	}

	const remote: RemoteState = createMutable({})

	createEffect(() => {
		const url = gameHandle()?.url
		const seen = JSON.parse(localStorage.getItem("seen") ?? "[]")
		seen.unshift(url)
		localStorage.setItem(
			"seen",
			JSON.stringify(Array.from(new Set(seen)).filter(Boolean))
		)
	})

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

	const score = () => gameState() && scoreGame(gameState()!)

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

	const progressIndex = () => {
		return (levels()?.filter(v => v <= (score() ?? 0)).length ?? 0) - 1
	}

	createEffect(() => {
		const complete = () => progressIndex() == 8
		if (complete()) {
			celebrate(["33ccff", "ff2a50", "ffff00", "00ffff", "ff00ff"])
		}

		if (complete() && gameState()?.found?.some(isPangram)) {
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

		if (score() === game()?.high) {
			gameHandle()?.change(state => (state.over = true))
		}
	})

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
							<a href="/play" style={{color: "var(--blue-crayola)"}}>
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
						class="copy"
						onClick={event => {
							navigator.clipboard.writeText(location.href)
							notify("copied to clipboard", {icon: "📋"})
							event.target.blur()
						}}>
						copy url
					</button>
					<a
						href="/"
						style={{display: "block"}}
						onClick={() => {
							location.hash = ""
							nav("/", {replace: true})
						}}>
						go to front page
					</a>

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
