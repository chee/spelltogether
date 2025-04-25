/* @refresh reload */
import {Router} from "@solidjs/router"
import {lazy} from "solid-js"
import {render} from "solid-js/web"

const app = document.getElementById("app")

render(
	() => (
		<Router>
			{[
				{path: "/", component: lazy(() => import("./pages/home/home.tsx"))},
				{
					path: "/play",
					component: lazy(() => import("./pages/play/play.tsx")),
				},
				{
					path: "/games",
					component: lazy(() => import("./pages/games/games.tsx")),
				},
			]}
		</Router>
	),
	app!
)
