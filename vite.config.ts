import {defineConfig} from "vite"
import solid from "vite-plugin-solid"
import wasm from "vite-plugin-wasm"
import {VitePWA} from "vite-plugin-pwa"
import autoprefixer from "autoprefixer"

export default defineConfig({
	plugins: [
		VitePWA({
			registerType: "autoUpdate",
			devOptions: {
				enabled: true,
			},
			workbox: {
				maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
			},
			manifest: {
				name: "Spelltogether",
				short_name: "Spelltogether",
				description: "A multiplayer word game",
				theme_color: "#00FDBC",
			},
		}),
		solid(),
		wasm(), // an inline vite plugin to handle .words files importing them as an array of
		// strings, one for each line
		{
			name: "words",
			transform(code, id) {
				if (id.endsWith(".words")) {
					const words = code
						.split("\n")
						.map(line => line.trim())
						.filter(line => line.length > 0)
					return `export default ${JSON.stringify(words)}`
				}
			},
		},
	],
	server: {port: 1234},
	build: {target: "esnext"},
	css: {
		postcss: {
			plugins: [autoprefixer({})],
		},
	},
})
