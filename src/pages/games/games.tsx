import type {AutomergeUrl} from "@automerge/automerge-repo"
import {makePersisted} from "@solid-primitives/storage"
import {createSignal, For, mapArray, Show, Suspense} from "solid-js"
import repo from "../../repo/export.ts"
import {useDocument} from "solid-automerge"
import {A, useNavigate} from "@solidjs/router"
import games from "../../words/games.json"
import Progress from "../../progress.tsx"
import {GameState, getLevels, levelNames, scoreGame} from "../../lib.ts"
import "./games.css"

const [seen, setSeen] = makePersisted(createSignal([] as AutomergeUrl[]), {
	name: "seen",
})

const gameStates = mapArray(seen, url => useDocument<GameState>(url, {repo}))

export default function Games() {
	const nav = useNavigate()

	return (
		<main class="games-main">
			<h1 class="games-title">The Games We Play</h1>
			<For each={gameStates()}>
				{([gameState, handle]) => {
					const game = () => games[gameState()?.game ?? 0]

					const url = () => "/play/?game=" + handle()?.documentId
					const time = () => new Date((handle()?.metadata()?.time ?? 0) * 1000)

					return (
						<Suspense>
							<article classList={{over: gameState()?.over, "game-card": true}}>
								<div onclick={() => nav(url())}>
									<A class="game-letters" href={url()}>
										{game()?.edge[0]}
										{game()?.edge[1]}
										{game()?.edge[2]}
										<span class="centre">{game()?.centre}</span>
										{game()?.edge[3]}
										{game()?.edge[4]}
										{game()?.edge[5]}
									</A>

									<Show when={gameState()?.over}> ✅</Show>

									<p>
										last update:
										<strong>
											<time class="time" datetime={time().toISOString()}>
												{time().toLocaleDateString("en-CA", {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</time>
										</strong>
									</p>

									<Show when={gameState()}>
										<Progress
											score={scoreGame(gameState()!)}
											high={game()?.high}
											levelNames={levelNames}
											levelValues={getLevels(game()!)}
										/>
									</Show>
								</div>
								<button
									class="fun-button danger"
									onClick={event => {
										;(event.altKey ||
											confirm("are you sure you want to forget this game?")) &&
											setSeen(seen().filter(url => url !== handle()?.url))
									}}>
									forget
								</button>
							</article>
						</Suspense>
					)
				}}
			</For>
			<a
				href="/"
				style={{display: "block"}}
				onClick={() => {
					location.hash = ""
					nav("/", {replace: true})
				}}>
				go to front page
			</a>
		</main>
	)
}
