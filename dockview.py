#!/usr/bin/env python3
"""DockView - A terminal UI for Docker containers with vim motions."""

from __future__ import annotations

import json
import re
import subprocess
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

from textual import work
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.widgets import Footer, Header, Static, DataTable


def get_containers():
    """Get all containers grouped by compose project."""
    result = subprocess.run(
        [
            "docker", "ps", "-a",
            "--format", "{{json .}}",
        ],
        capture_output=True, text=True,
    )
    containers = []
    for line in result.stdout.strip().split("\n"):
        if line:
            containers.append(json.loads(line))

    grouped = defaultdict(list)
    for c in containers:
        project = c.get("Labels", "")
        proj_name = ""
        for label in project.split(","):
            if label.startswith("com.docker.compose.project="):
                proj_name = label.split("=", 1)[1]
                break
        if not proj_name:
            proj_name = "(standalone)"
        grouped[proj_name].append(c)

    return grouped


def parse_host_ports(ports_str):
    """Extract just the host ports from docker ports string."""
    if not ports_str:
        return "-"
    matches = re.findall(r"0\.0\.0\.0:(\d+)->", ports_str)
    if matches:
        return ", ".join(sorted(set(matches), key=int))
    return "-"


def docker_cmd(action, container_name):
    """Run a docker command on a container."""
    subprocess.run(["docker", action, container_name], capture_output=True)


class DockView(App):
    CSS = """
    Screen {
        layout: vertical;
    }
    DataTable {
        height: 1fr;
    }
    DataTable > .datatable--cursor {
        background: $accent;
        color: $text;
    }
    #status-bar {
        dock: bottom;
        height: 1;
        background: $surface;
        color: $text-muted;
        padding: 0 1;
    }
    """

    TITLE = "DockView"
    BINDINGS = [
        Binding("q", "quit", "Quit"),
        Binding("j", "cursor_down", "Down", show=False),
        Binding("k", "cursor_up", "Up", show=False),
        Binding("r", "restart", "Restart"),
        Binding("s", "start", "Start"),
        Binding("c", "stop", "Stop"),
        Binding("l", "logs", "Logs"),
        Binding("G", "go_bottom", "Bottom", show=False),
        Binding("h", "toggle_filter", "Hide/Show Stopped"),
        Binding("R", "restart_project", "Restart Project"),
        Binding("S", "start_project", "Start Project"),
        Binding("C", "stop_project", "Stop Project"),
        Binding("f5", "refresh", "Refresh"),
    ]

    _last_key = ""
    _show_all = True

    def compose(self) -> ComposeResult:
        yield Header()
        yield DataTable(id="table")
        yield Static("", id="status-bar")
        yield Footer()

    def on_mount(self) -> None:
        table = self.query_one(DataTable)
        table.cursor_type = "row"
        table.add_columns("Project", "Container", "Status", "Port")
        self.load_containers()
        self.set_interval(5, self.load_containers)

    def load_containers(self) -> None:
        table = self.query_one(DataTable)
        status_bar = self.query_one("#status-bar", Static)

        # Remember selected row
        selected_key = None
        prev_row_idx = table.cursor_coordinate.row
        try:
            row_key, _ = table.coordinate_to_cell_key(table.cursor_coordinate)
            selected_key = row_key.value
        except Exception:
            pass

        table.clear()
        grouped = get_containers()
        total = 0
        running = 0
        row_names = []

        for project in sorted(grouped.keys()):
            containers = grouped[project]
            for c in containers:
                name = c.get("Names", "")
                status = c.get("Status", "")
                ports = parse_host_ports(c.get("Ports", ""))

                is_running = "Up" in status

                if is_running:
                    status_display = f"[green]{status}[/green]"
                    running += 1
                elif "Exited" in status:
                    status_display = f"[red]{status}[/red]"
                else:
                    status_display = f"[yellow]{status}[/yellow]"

                if not self._show_all and not is_running:
                    total += 1
                    continue

                table.add_row(
                    f"[bold cyan]{project}[/bold cyan]",
                    name,
                    status_display,
                    ports,
                    key=name,
                )
                row_names.append(name)
                total += 1

        # Restore cursor position
        restore_idx = None
        if selected_key and selected_key in row_names:
            restore_idx = row_names.index(selected_key)
        if restore_idx is None and prev_row_idx < total:
            restore_idx = prev_row_idx
        if restore_idx is not None:
            table.move_cursor(row=restore_idx)

        filter_label = "all" if self._show_all else "running only"
        status_bar.update(f" {running}/{total} running | filter: {filter_label}")

    def get_selected_container(self) -> str | None:
        table = self.query_one(DataTable)
        try:
            row_key, _ = table.coordinate_to_cell_key(table.cursor_coordinate)
            return row_key.value
        except Exception:
            return None

    def get_selected_project(self) -> str | None:
        table = self.query_one(DataTable)
        try:
            row_idx = table.cursor_coordinate.row
            project_cell = table.get_cell_at((row_idx, 0))
            # Strip rich markup
            return re.sub(r"\[.*?\]", "", project_cell)
        except Exception:
            return None

    def get_containers_for_project(self, project: str) -> list[str]:
        grouped = get_containers()
        return [c.get("Names", "") for c in grouped.get(project, [])]

    def on_key(self, event) -> None:
        if event.key == "g" and self._last_key == "g":
            table = self.query_one(DataTable)
            table.move_cursor(row=0)
            self._last_key = ""
            event.prevent_default()
            return
        self._last_key = event.key

    def action_cursor_down(self) -> None:
        self.query_one(DataTable).action_cursor_down()

    def action_cursor_up(self) -> None:
        self.query_one(DataTable).action_cursor_up()

    def action_go_bottom(self) -> None:
        table = self.query_one(DataTable)
        table.move_cursor(row=table.row_count - 1)

    @work(thread=True)
    def action_restart(self) -> None:
        name = self.get_selected_container()
        if name:
            self.notify(f"Restarting {name}...")
            docker_cmd("restart", name)
            self.app.call_from_thread(self.load_containers)
            self.notify(f"{name} restarted", severity="information")

    @work(thread=True)
    def action_start(self) -> None:
        name = self.get_selected_container()
        if name:
            self.notify(f"Starting {name}...")
            docker_cmd("start", name)
            self.app.call_from_thread(self.load_containers)
            self.notify(f"{name} started", severity="information")

    @work(thread=True)
    def action_stop(self) -> None:
        name = self.get_selected_container()
        if name:
            self.notify(f"Stopping {name}...")
            docker_cmd("stop", name)
            self.app.call_from_thread(self.load_containers)
            self.notify(f"{name} stopped", severity="information")

    @work(thread=True)
    def action_restart_project(self) -> None:
        project = self.get_selected_project()
        if project:
            containers = self.get_containers_for_project(project)
            self.notify(f"Restarting all {len(containers)} containers in {project}...")
            with ThreadPoolExecutor() as pool:
                pool.map(lambda name: docker_cmd("restart", name), containers)
            self.app.call_from_thread(self.load_containers)
            self.notify(f"{project} restarted ({len(containers)} containers)", severity="information")

    @work(thread=True)
    def action_start_project(self) -> None:
        project = self.get_selected_project()
        if project:
            containers = self.get_containers_for_project(project)
            self.notify(f"Starting all {len(containers)} containers in {project}...")
            with ThreadPoolExecutor() as pool:
                pool.map(lambda name: docker_cmd("start", name), containers)
            self.app.call_from_thread(self.load_containers)
            self.notify(f"{project} started ({len(containers)} containers)", severity="information")

    @work(thread=True)
    def action_stop_project(self) -> None:
        project = self.get_selected_project()
        if project:
            containers = self.get_containers_for_project(project)
            self.notify(f"Stopping all {len(containers)} containers in {project}...")
            with ThreadPoolExecutor() as pool:
                pool.map(lambda name: docker_cmd("stop", name), containers)
            self.app.call_from_thread(self.load_containers)
            self.notify(f"{project} stopped ({len(containers)} containers)", severity="information")

    def action_logs(self) -> None:
        name = self.get_selected_container()
        if name:
            script = f'''
            tell application "iTerm2"
                tell current window
                    set newTab to (create tab with default profile)
                    tell current session of newTab
                        write text "docker logs -f --tail 200 {name} 2>&1 | dockview-fmt"
                    end tell
                end tell
            end tell
            '''
            subprocess.Popen(["osascript", "-e", script])
            self.notify(f"Opened logs for {name} in new terminal")

    def action_toggle_filter(self) -> None:
        self._show_all = not self._show_all
        self.load_containers()
        label = "all" if self._show_all else "running only"
        self.notify(f"Showing: {label}")

    def action_refresh(self) -> None:
        self.load_containers()
        self.notify("Refreshed")


if __name__ == "__main__":
    app = DockView()
    app.run()
