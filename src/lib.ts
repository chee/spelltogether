import confetti from "canvas-confetti"
import {z} from "zod"
// thanks to ConorSheehan1 for these words
import games from "./words/games.json"

const confettiConfig = {
	spread: 360,
	ticks: 50,
	gravity: 0,
	decay: 0.94,
	startVelocity: 30,
}

export function celebrate(
	colors: string[] = ["FFE400", "FFBD00", "E89400", "ff7faa", "ffec1a"]
) {
	confetti({
		...confettiConfig,
		particleCount: 40,
		scalar: 1.2,
		shapes: ["star"],
		colors,
	})

	confetti({
		...confettiConfig,
		particleCount: 10,
		scalar: 0.75,
		shapes: ["circle"],
		colors,
	})
}

export const levelNames = [
	"beginner",
	"ok let's go",
	"now we're talking",
	"v nice",
	"pretty cool",
	"sick",
	"yay!",
	"omg!!",
	"wow!! you're amazing",
]
function int() {
	const a = new Uint32Array(1)
	window.crypto.getRandomValues(a)
	return a[0]
}

export const GameState = z.object({
	found: z.string().array().default([]),
	game: z
		.number()
		.default(() => Math.floor(lerp(0, games.length - 1, int() / 0xffffffff))),
	over: z.boolean().default(false),
})

function lerp(a: number, b: number, t: number) {
	return a + (b - a) * t
}

export type GameState = z.infer<typeof GameState>

export function isPangram(word: string) {
	return new Set(word).size == 7
}

export function scoreWord(word: string): number {
	if (word.length === 4) return 1
	if (isPangram(word)) return word.length + 7
	return word.length
}

export function scoreGame(game: GameState): number {
	return game.found?.reduce((score, word) => score + scoreWord(word), 0) ?? 0
}

function inkedup(items: number[]): number[] {
	const seen = new Set()
	return items.map(num => {
		while (seen.has(num)) {
			num += 1
		}
		seen.add(num)
		return num
	})
}

type SingleGame = (typeof games)[number]

export function getLevels(game: SingleGame): Array<number> {
	let levels = [
		0,
		5,
		Math.floor(game.high * 0.1),
		Math.floor(game.high * 0.2),
		Math.floor(game.high * 0.3),
		Math.floor(game.high * 0.4),
		Math.floor(game.high * 0.5),
		Math.floor(game.high * 0.55),
		Math.floor(game.high * 0.6),
	].sort((a, b) => a - b)
	levels = inkedup(levels)
	const min = Math.min(...levels)
	return levels.map((l: number) => l - min)
}
