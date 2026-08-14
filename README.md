# DockView

Vim-motion TUI for Docker Container Management: live container status and prettified logs in one screen.

Tired of clicking through Docker Desktop for something I use every day. dockview lists every container, grouped by repo with status and exposed ports — hit `Enter` for prettified logs, `Esc` back. No extra tab, no `docker logs` incantation.

![Node](https://img.shields.io/badge/Node-20%2B-green)
![Platform](https://img.shields.io/badge/Platform-macOS-lightgrey)
![License](https://img.shields.io/badge/License-MIT-green)

![dockview landing view — containers grouped by project with status and ports](docs/dockview-landing.png)
![dockview log preview — prettified container logs in-pane](docs/dockview-logs.png)

## Features

- Containers grouped by Compose project
- Color-coded status (green = running, red = exited)
- In-pane log preview with JSON pretty-printing
- Parallel project-wide start / stop / restart
- Auto-refresh every 5s
- Themeable via `~/.config/dockview/theme.json`

## Keybindings

Main view

| Key | Action |
|-----|--------|
| `j` / `k` | Move down / up |
| `gg` / `G` | Top / bottom |
| `s` / `c` / `r` | Start / stop / restart container |
| `S` / `C` / `R` | Same, whole project |
| `l` / `Enter` | Open log preview |
| `h` | Toggle all / running-only |
| `q` | Quit |

Log preview

| Key | Action |
|-----|--------|
| `j` / `k` | Scroll (down = newer) |
| `Ctrl-D` / `Ctrl-U` | Half-page scroll |
| `gg` | Jump to top |
| `G` | Jump to tail (auto-follow) |
| `l` / `Enter` / `Esc` | Close preview |

## Install

```bash
git clone https://github.com/senorale/dockview.git
cd dockview
make install
```

Installs a shim at `~/.local/bin/dockview` — add to PATH if needed:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
```

## Usage

```bash
dockview                              # launch TUI
dockview --theme mono                 # start with mono theme
docker logs -f <container> | dockview fmt   # standalone JSON log formatter
```

## Theming

Set `$DOCKVIEW_THEME=mono`, pass `--theme mono`, or drop `~/.config/dockview/theme.json`:

```json
{
  "extends": "default",
  "selectedBg": "magenta",
  "running": "#00ff88"
}
```

## Debugging

`DOCKVIEW_DEBUG=1 dockview` appends to `~/.claude/dockview/debug.log`. `tail -f` in another tab.

## Tech stack

- [Ink 5](https://github.com/vadimdemedes/ink) — React for the terminal
- [commander](https://github.com/tj/commander.js) — CLI parsing
- [execa](https://github.com/sindresorhus/execa) — subprocess wrangler
- Docker CLI — `docker ps`, `docker start|stop|restart`, `docker logs -f`
