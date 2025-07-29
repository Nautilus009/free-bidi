Free Bidi VS Code Extension
Overview
The Free Bidi extension for Visual Studio Code simplifies working with COBOL files containing Hebrew text. It automatically converts files from ISO-8859-8 or windows-1255 encodings to UTF-8, adding Left-to-Right Override (LRO, \u202D) markers before Hebrew text to ensure proper display. The converted files are stored in a .freebidi directory and opened in VS Code with UTF-8 encoding. When typing new Hebrew characters in these converted files, the extension automatically inserts LRO markers to maintain consistent text direction.
Features

Automatic Conversion: Converts .cob or .COB files with Hebrew text from ISO-8859-8 or windows-1255 to UTF-8 with LRO markers.
Temporary Files: Saves converted files in a .freebidi directory, which are deleted when closed.
Real-Time Hebrew Support: Automatically inserts LRO markers (\u202D) before new Hebrew characters typed in .freebidi files.
Encoding Enforcement: Ensures .freebidi files are opened with UTF-8 encoding, regardless of VS Code?s files.encoding or files.autoGuessEncoding settings.
Non-Recursive: Prevents recursive file opening for .freebidi files.
Save Back: Updates the original file (in ISO-8859-8) when saving changes to the .freebidi file, removing LRO markers.

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
    "editor.unicodeHighlight.invisibleCharacters": false
}

The settings "editor.renderControlCharacters": false and "editor.unicodeHighlight.invisibleCharacters": false prevent visual glyphs for LRO markers and other invisible Unicode characters, ensuring a clean editing experience.



Usage

Open a COBOL File:

Open a .cob or .COB file containing Hebrew text (e.g., /Users/orennissan/Desktop/test.cob).
Set the language mode to COBOLIT (Ctrl+Shift+P ? ?Change Language Mode? ? COBOLIT).


Automatic Conversion:

The extension detects the file?s encoding (ISO-8859-8 or windows-1255) and creates a UTF-8 version with LRO markers in the .freebidi directory (e.g., /Users/orennissan/Desktop/.freebidi/test.cob).
The converted file opens automatically in VS Code with UTF-8 encoding.


Edit Hebrew Text:

When typing Hebrew characters (e.g., à) in the .freebidi file, the extension automatically inserts \u202D before each Hebrew sequence to maintain text direction.


Save Changes:

Saving the .freebidi file updates the original file, removing LRO markers and encoding it back to ISO-8859-8.


Close File:

Closing the .freebidi file deletes it to keep your workspace clean.



Manual Conversion

Run the command Free Bidi: Convert ISO-8859-8 to UTF-8 (Ctrl+Shift+P ? type ?Free Bidi?) to manually convert a file with the iso88598 language ID.

Troubleshooting

File Not Converting:

Ensure the file has the COBOLIT language ID.
Check the Output panel (free-bidi) for error messages.
Verify the file contains Hebrew characters (\u0590-\u05FF).


Encoding Issues:

Confirm the .freebidi file opens with UTF-8 (check the status bar).
Run the following to inspect the file:xxd -l 3 /Users/orennissan/Desktop/.freebidi/test.cob


Expect: 00000000: efbb bf ... (UTF-8 BOM).




LRO Not Inserted:

Ensure you?re editing the .freebidi file, not the original .cob file.
Check the Output panel for Inserted LRO before Hebrew text....


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