Free Bidi Extension
The Free Bidi extension for Visual Studio Code converts COBOL (.cob) files encoded in ISO-8859-8 with Hebrew text to UTF-8, adding Left-to-Right Override (LRO, \u202D) markers for proper display. It also supports saving back to ISO-8859-8 and manages temporary files in a .freebidi directory.
Features

Automatic Conversion: On opening a .cob file with the COBOLIT language ID, the extension decodes it from ISO-8859-8, adds LRO markers to Hebrew text (\u0590-\u05FF), saves the result to .freebidi/<filename>.cob in UTF-8, and opens the converted file.
Manual Conversion: Use the Free Bidi: Convert ISO-8859-8 to UTF-8 command (requires iso88598 language ID) to manually convert a .cob file.
Save Handling: When saving a .freebidi/*.cob file, it removes LRO markers, converts back to ISO-8859-8, and updates the original .cob file.
File Cleanup: Deletes the .freebidi/*.cob file when its editor tab is closed.
Hebrew Text Support: Automatically adds LRO markers to new Hebrew text entered in .freebidi/*.cob files.

Requirements

Visual Studio Code 1.91.0 or higher.
COBOL files encoded in ISO-8859-8 containing Hebrew text (\u0590-\u05FF).
The COBOLIT language ID for automatic conversion or iso88598 for manual conversion.

Installation

Download the .vsix file from the release or build it locally.
In VS Code, go to Extensions (Ctrl+Shift+X) ? ... ? Install from VSIX.
Select the free-bidi-0.0.1.vsix file.

Usage

Automatic Conversion:
Open a .cob file (e.g., test.cob) containing Hebrew text.
Set the language to COBOLIT (Ctrl+Shift+P ? ?Change Language Mode? ? COBOLIT).
The extension creates .freebidi/test.cob in UTF-8 with LRO markers and opens it.


Manual Conversion:
Open a .cob file and set the language to iso88598.
Run the command Free Bidi: Convert ISO-8859-8 to UTF-8 (Ctrl+Shift+P).


Editing and Saving:
Edit the .freebidi/*.cob file.
Save (Ctrl+S) to update the original .cob file in ISO-8859-8.
Close the .freebidi/*.cob tab to delete the temporary file.



Example
For a file test.cob with content:
ωμεν
COBOL DATA


Open with COBOLIT language ID.
Output in .freebidi/test.cob (UTF-8):

\u202Dωμεν
COBOL DATA


Save updates test.cob in ISO-8859-8 without LRO markers.

Troubleshooting

File Not Processed: Ensure the file contains Hebrew characters (\u0590-\u05FF) and is encoded in ISO-8859-8. Check the Output panel (Ctrl+Shift+U, select free-bidi) for logs.
Encoding Issues: If the file is in windows-1255, contact the developer for a version with fallback support.
Logs: Enable verbose logging by checking the Output panel.

Contributing
File issues or contribute at GitHub repository.
License
MIT License