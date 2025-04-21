/* @refresh reload */

import {Repo} from "@automerge/automerge-repo"
import {IndexedDBStorageAdapter} from "@automerge/automerge-repo-storage-indexeddb"
import {BrowserWebSocketClientAdapter} from "@automerge/automerge-repo-network-websocket"

export default new Repo({
	storage: new IndexedDBStorageAdapter(),
	network: [
		new BrowserWebSocketClientAdapter("wss://galaxy.observer"),
		new BrowserWebSocketClientAdapter("wss://sync.automerge.org"),
	],
	enableRemoteHeadsGossiping: true,
})
