PROJECT_DIR := $(HOME)/projects/dockview
BIN_DIR     := $(HOME)/.local/bin
BIN         := $(BIN_DIR)/dockview

.PHONY: help install build shim uninstall smoke check-iterm

help:
	@echo "make install    — build TS + install shim to ~/.local/bin/dockview"
	@echo "make build      — npm install + tsc build"
	@echo "make shim       — (re)write the ~/.local/bin/dockview shim"
	@echo "make smoke      — run a non-destructive smoke test"
	@echo "make uninstall  — remove ~/.local/bin/dockview"

install: check-iterm build shim
	@echo ""
	@echo "dockview installed. Try:"
	@echo "  dockview"
	@echo "  docker logs -f --tail 200 <container> | dockview fmt"

check-iterm:
	@if [ "$$TERM_PROGRAM" != "iTerm.app" ]; then \
		printf '\033[33mwarning:\033[0m iTerm2 not detected (TERM_PROGRAM=%s). dockview uses AppleScript against iTerm2 to open log tabs; the `l` binding will not work elsewhere. Install: brew install --cask iterm2\n' "$${TERM_PROGRAM:-unset}"; \
	fi

build:
	@npm install --silent
	@npm run build --silent

shim:
	@mkdir -p $(BIN_DIR)
	@printf '%s\n' \
		'#!/usr/bin/env bash' \
		'# dockview shim — runs `node dist/cli.js` from ~/projects/dockview' \
		'exec node "$$HOME/projects/dockview/dist/cli.js" "$$@"' \
		> $(BIN)
	@chmod +x $(BIN)
	@echo "installed shim: $(BIN)"

smoke:
	@$(BIN) --version
	@echo '{"level":"info","timestamp":"2026-07-24T10:00:00Z","message":"smoke test"}' | $(BIN) fmt

uninstall:
	rm -f $(BIN)
