Free Bidi VS Code Extension
Overview
The Free Bidi extension for Visual Studio Code simplifies working with COBOL files containing RTL language text. It automatically converts files from a configurable RTL encoding (default: ISO-8859-8) to UTF-8, adding Left-to-Right Override (LRO, \u202D) markers before RTL language text to ensure proper display. The converted files are stored in a .freebidi directory and opened in VS Code with UTF-8 encoding. When typing new RTL language characters in these converted files, the extension automatically inserts LRO markers to maintain consistent text direction.
Features

Automatic Conversion: Converts .cob or .COB files with RTL language text from a configurable RTL encoding (default: ISO-8859-8) to UTF-8 with LRO markers.
Smart Tab Management: When opening a source file that has an existing .freebidi version, automatically closes the original file tab and opens only the freebidi version.
Line Number Preservation: When opening a file with a specific line number (e.g., src/file.cob:100), the freebidi version opens at the same line position.
Temporary Files: Saves converted files in a .freebidi directory, which are automatically deleted when their tabs are closed.
Real-Time RTL language Support: Automatically inserts LRO markers (\u202D) before new RTL language characters typed in .freebidi files.
Encoding Enforcement: Ensures .freebidi files are opened with UTF-8 encoding, regardless of VS Code?s files.encoding or files.autoGuessEncoding settings.
Non-Recursive: Prevents recursive file opening for .freebidi files.
Save Back: Updates the original file using the configured RTL encoding (default: ISO-8859-8) when saving changes to the .freebidi file, removing LRO markers.

Installation

Install the Extension:

Open VS Code.
Go to the Extensions view (Ctrl+Shift+X or Cmd+Shift+X on macOS).
Search for Free Bidi by NLTCInc.
Click Install.


Set Up Dependencies:

Ensure Node.js is installed for development (optional).
Run npm install in the extension directory (~/free-bidi) to install dependencies like iconv-lite.


Configure VS Code Settings:

Open VS Code settings (Ctrl+, or Cmd+, on macOS).
Add the following to settings.json for the best experience:{
    "editor.renderControlCharacters": false,
    "editor.unicodeHighlight.invisibleCharacters": false,
    "freeBidi.rtlEncoding": "ISO-8859-8"
}

The settings "editor.renderControlCharacters": false and "editor.unicodeHighlight.invisibleCharacters": false prevent visual glyphs for LRO markers and other invisible Unicode characters, ensuring a clean editing experience.



Usage

Open a COBOL File:

Open a .cob or .COB file containing RTL language text (e.g., /Users/orennissan/Desktop/test.cob).
Set the language mode to COBOLIT (Ctrl+Shift+P ? ?Change Language Mode? ? COBOLIT).


Automatic Conversion:

The extension uses freeBidi.rtlEncoding from settings.json (default: ISO-8859-8) and creates a UTF-8 version with LRO markers in the .freebidi directory (e.g., /Users/orennissan/Desktop/.freebidi/test.cob).
The converted file opens automatically in VS Code with UTF-8 encoding.


Edit RTL language Text:

When typing RTL language characters in the .freebidi file, the extension automatically inserts \u202D before each RTL language sequence to maintain text direction.


Save Changes:

Saving the .freebidi file updates the original file, removing LRO markers and encoding it back using freeBidi.rtlEncoding (default: ISO-8859-8).


Close File:

Closing the .freebidi file deletes it to keep your workspace clean.



Manual Conversion

Run the command Free Bidi: Convert RTL encoding to UTF-8 (Ctrl+Shift+P ? type ?Free Bidi?) to manually convert a file with the iso88598 language ID.

Troubleshooting

File Not Converting:

Ensure the file has the COBOLIT language ID.
Check the Output panel (free-bidi) for error messages.
Verify the file contains RTL language characters.


Encoding Issues:

Confirm the .freebidi file opens with UTF-8 (check the status bar).
Run the following to inspect the file:xxd -l 3 /Users/orennissan/Desktop/.freebidi/test.cob


Expect: 00000000: efbb bf ... (UTF-8 BOM).




LRO Not Inserted:

Ensure you're editing the .freebidi file, not the original .cob file.
Check the Output panel for Inserted LRO before RTL language text....


Extension Not Activating:

Check the Output panel for Free Bidi extension activated on platform: ....
Disable conflicting extensions like redhat.java (see settings above).
Clear workspace storage:rm -rf ~/Library/Application\ Support/Code/User/workspaceStorage/9eee23559e7c9649f178964da0909a5c




Debugging:

Open the extension in VS Code (~/free-bidi).
Set breakpoints in src/extension.ts.
Run ?Run Extension? in the Debug view (F5).
Share Debug Console and Output panel logs if issues persist.



Development

Clone the Repository:
git clone https://github.com/Nautilus009/free-bidi.git ~/free-bidi


Install Dependencies:
cd ~/free-bidi
npm install


Compile:
npm run compile


Test:
npm test


Publish:
npx vsce login NLTCInc
npx vsce publish



Contact
For issues, feature requests, or contributions, visit the GitHub repository or file an issue.
