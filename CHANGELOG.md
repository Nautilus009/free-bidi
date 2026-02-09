# Change Log

All notable changes to the "free-bidi" extension will be documented in this file.

## [0.0.6] - 2026-02-08

### Added
- **Line number preservation**: When opening a source file with a specific line number (e.g., `file.cob:100`), the freebidi version now opens at the same line
- **Enhanced cursor positioning**: Improved timing mechanism to ensure cursor position is correctly captured and applied when switching to freebidi files

### Changed
- Switched from `onDidOpenTextDocument` to `onDidChangeActiveTextEditor` for more reliable file interception
- Added delay mechanism (100ms) to allow VSCode to navigate to requested line before capturing position
- Improved handling of both existing freebidi files and new conversions

### Fixed
- Fixed tab closing errors with better error handling and graceful failure recovery
- Resolved timing issues that caused cursor to jump to line 1 instead of requested line
- Fixed regression where original source file would remain open alongside freebidi version

## [0.0.5] - 2026-02-08

### Added
- **Auto-close original file tab**: When opening a source file (e.g., `a.cob`) that has an existing `.freebidi` version, the original file tab is now automatically closed, leaving only the freebidi version open
- **Improved tab management**: Switched to VSCode Tab Groups API for more reliable tab detection and closing
- **Enhanced file cleanup**: Freebidi temporary files are now reliably deleted when their tabs are closed, with retry logic for locked file handles

### Changed
- Refactored file open handler to check for existing freebidi files before conversion
- Improved tab closing mechanism using `vscode.window.tabGroups` API instead of command execution
- Enhanced file deletion with timeout and retry logic to handle file handle release delays

### Fixed
- Original source files no longer remain open when a freebidi version exists
- Freebidi temporary files are now properly deleted when tabs are closed
- Tab closing is now more reliable across different scenarios

## [0.0.4] - Previous Release

### Features
- Automatic conversion of ISO-8859-8 COBOL files to UTF-8 with LRO markers
- Support for Hebrew text in COBOL files
- Automatic insertion of LRO markers before Hebrew text segments
- Save changes back to original ISO-8859-8 format
