import {isValidAutomergeUrl, parseAutomergeUrl} from "@automerge/automerge-repo"
import {useNavigate} from "@solidjs/router"
import "./home.css"

export default function Home() {
	const nav = useNavigate()
	const hashy = location.hash.slice(1)
	if (isValidAutomergeUrl(hashy)) {
		nav("/play/" + parseAutomergeUrl(hashy).documentId)
	}
	return (
		<main>
			<h1>Spelltogether</h1>
			<img
				src="/favicon.svg"
				alt=""
				style={{"max-width": "calc(100% - 4em)"}}></img>
			<p>
				<button
					class="join"
					onClick={async () => {
						const url = prompt(
							"enter the url your best friend sent you"
						)?.trim()
						try {
							if (url) {
								if (isValidAutomergeUrl(url)) {
									nav("/play/#" + url)
								} else if (url.startsWith("https://")) {
									location.href = url
								} else {
									throw ""
								}
							} else {
								throw ""
							}
						} catch {
							alert("please...! enter the url!")
						}
					}}>
					join a game
				</button>
			</p>
			<p>
				<a href="/play">Start a new game</a>
			</p>
			<p>
				<a href="/games">Revisit old games</a>
			</p>
		</main>
	)
}
