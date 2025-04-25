/* @refresh reload */
import {render} from "solid-js/web"
import {Outlet} from "@tanstack/solid-router"

const app = document.getElementById("app")

render(() => <Outlet />, app!)
