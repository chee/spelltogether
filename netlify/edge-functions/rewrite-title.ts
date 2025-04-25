import type {Config, Context} from "@netlify/edge-functions"
import {
	HTMLRewriter,
	init,
	Element,
} from "https://ghuc.cc/netlify/htmlrewriter/src/index.ts"

export default async (request: Request, context: Context) => {
	await init()
	const url = new URL(request.url)
	const documentId = url.searchParams.get("game")
	if (!documentId) return
	const gameState = await (
		await fetch("https://galaxy.observer/document/" + documentId)
	).json()
	const games = await (
		await fetch("https://spell.galaxy.observer/games.json")
	).json()
	const game = games[gameState.game]
	const response = await context.next()

	return new HTMLRewriter()
		.on("title", {
			element(element: Element) {
				element.setInnerContent(
					`${game.edge.slice(0, 3)}[${game.centre}]${game.edge[5]}${
						game.edge[4]
					}${game.edge[3]} | spelltogether`
				)
			},
		})
		.transform(response)
}

export const config: Config = {
	path: "/play",
}
