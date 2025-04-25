import type {Config, Context} from "@netlify/edge-functions"
import {
	HTMLRewriter,
	init,
	Element,
} from "https://ghuc.cc/netlify/htmlrewriter/src/index.ts"
import {automergeWasmBase64} from "@automerge/automerge/automerge.wasm.base64.js"
import {
	initializeBase64Wasm,
	Repo,
	type DocumentId,
} from "@automerge/automerge-repo/slim"
import {WebSocketClientAdapter} from "@automerge/automerge-repo-network-websocket"

await initializeBase64Wasm(automergeWasmBase64)

export default async (request: Request, context: Context) => {
	const repo = new Repo({
		network: [new WebSocketClientAdapter("wss://galaxy.observer")],
	})

	await init()
	const url = new URL(request.url)
	const documentId = url.searchParams.get("game")
	const response = await context.next()
	response.headers.set(
		"Cache-Control",
		"public, max-age=60, s-maxage=60, stale-while-revalidate=60"
	)
	response.headers.set("Netlify-Vary", "query=game")
	if (!documentId) return response
	const gameState = (
		await repo.find<{game: number}>(documentId as DocumentId)
	).doc()
	const games = await (
		await fetch("https://spell.galaxy.observer/games.json")
	).json()
	const game = games[gameState.game]

	const hive = `${game.edge.slice(0, 3)}[${game.centre}]${game.edge[5]}${
		game.edge[4]
	}${game.edge[3]}`
	const banner = `${hive} | spelltogether`

	return new HTMLRewriter()
		.on("title", {
			element(element: Element) {
				element.setInnerContent(banner)
			},
		})
		.on("meta", {
			element(element: Element) {
				if (
					element.getAttribute("name") === "twitter:title" ||
					element.getAttribute("property") === "og:title"
				) {
					element.setAttribute("content", banner)
				}
			},
		})
		.transform(response)
}

export const config: Config = {
	path: "/play",
}
