.PHONY: build install clean deps

DIST_DIR := dist
BIN_DIR := $(HOME)/bin

deps:
	pip3 install textual pyinstaller

build: deps
	pyinstaller --distpath $(DIST_DIR) dockview.spec
	pyinstaller --onefile --name dockview-fmt --distpath $(DIST_DIR) dockview_fmt.py
	@echo "Build complete: $(DIST_DIR)/dockview and $(DIST_DIR)/dockview-fmt"

install: build
	mkdir -p $(BIN_DIR)
	cp $(DIST_DIR)/dockview $(BIN_DIR)/dockview
	cp $(DIST_DIR)/dockview-fmt $(BIN_DIR)/dockview-fmt
	@echo "Installed to $(BIN_DIR)"

clean:
	rm -rf build dist *.spec.__pycache__
