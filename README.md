# DockView

A terminal UI for managing Docker containers with vim motions. Containers are grouped by Docker Compose project for easy navigation.
<img width="1368" height="941" alt="Screenshot 2026-02-13 at 1 09 45 PM" src="https://github.com/user-attachments/assets/33f78423-ec31-4324-b33e-faa99d5304ec" />

![Python](https://img.shields.io/badge/Python-3.9%2B-blue)
![Platform](https://img.shields.io/badge/Platform-macOS-lightgrey)
![License](https://img.shields.io/badge/License-MIT-green)

> **Note:** Live log viewing (`l` key) requires [iTerm2](https://iterm2.com/). If you use a different terminal, update the AppleScript in `dockview.py`.

## Features

- Containers grouped by Docker Compose project
- Color-coded status (green = running, red = exited)
- Live log streaming in a new iTerm2 tab with formatted output
- Parallel project-wide restart
- Auto-refresh every 5 seconds

## Keybindings

| Key | Action |
|-----|--------|
| `j` / `k` | Navigate up / down |
| `gg` | Jump to top |
| `G` | Jump to bottom |
| `r` | Restart container |
| `s` | Start container |
| `c` | Stop container |
| `R` | Restart all containers in project |
| `l` | Open live logs in new iTerm2 tab |
| `F5` | Force refresh |
| `q` | Quit |

## Install

### From source (any Mac)

```bash
git clone https://github.com/senorale/dockview.git
cd dockview
make install
```

This installs standalone binaries to `~/bin`. Make sure `~/bin` is in your PATH:

```bash
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Run without building

If you have Python 3.9+ and `textual` installed:

```bash
pip3 install textual
python3 dockview.py
```

## Dependencies

**Runtime (standalone binary):** None — everything is bundled.

**Build time:** Python 3.9+, `textual`, `pyinstaller` (installed automatically by `make`).

## Tech Stack

- **[Textual](https://github.com/Textualize/textual)** — TUI framework
- **Docker CLI** — container management via `docker ps`, `docker start/stop/restart`
- **AppleScript** — iTerm2 tab management
- **PyInstaller** — standalone binary packaging
