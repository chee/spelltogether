/* @refresh reload */
import {render} from "solid-js/web"
import App from "./pages/app/app.tsx"
const app = document.getElementById("app")
render(() => <App />, app!)
