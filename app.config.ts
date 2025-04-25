import {defineConfig} from "@tanstack/solid-start/config"

export default defineConfig({
	server: {
		hooks: {
			"prerender:routes": async routes => {
				// fetch the pages you want to render
				const posts = await fetch("https://api.example.com/posts")
				const postsData = await posts.json()

				// add each post path to the routes set
				postsData.forEach(post => {
					routes.add(`/posts/${post.id}`)
				})
			},
		},
		prerender: {
			routes: ["/"],
			crawlLinks: true,
		},
	},
})
