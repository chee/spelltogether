import {
	rootRoute,
	route,
	index,
	layout,
	physical,
} from "@tanstack/virtual-file-routes"

export const routes = rootRoute("../root.tsx", [
	index("../pages/home/home.tsx"),
	route("/play/$id", "../pages/play/play.tsx"),
	route("/games", "../pages/games/games.tsx"),
])
