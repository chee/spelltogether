import {defineConfig} from "vite"
import solid from "vite-plugin-solid"
import wasm from "vite-plugin-wasm"

export default defineConfig({
	plugins: [
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
})
