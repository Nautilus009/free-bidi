import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as iconv from 'iconv-lite';

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension activated for free-bidi');

    // Process .cob files on open: convert to UTF-8, add LRO to Hebrew segments, save to .freebidi/<filename>.cob, open it
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(async document => {
            const fsPath = document.uri.fsPath;
            console.log('File opened:', fsPath, 'Language ID:', document.languageId);
            // Skip if file is in .freebidi directory or not a .cob file
            if (fsPath.includes('/.freebidi/') || !fsPath.endsWith('.cob') || document.languageId !== 'COBOLIT') {
                console.log('Skipping processing for:', fsPath, 'Reason:', {
                    isUtf8Dir: fsPath.includes('/.freebidi/'),
                    isIsoFile: fsPath.endsWith('.cob'),
                    languageId: document.languageId
                });
                return;
            }
            try {
                // Read file content
                const content = fs.readFileSync(fsPath);
                // Check if file is likely ISO-8859-8 encoded
                let isIso8859 = false;
                try {
                    const decoded = iconv.decode(content, 'iso-8859-8');
                    // Check for Hebrew characters to confirm encoding
                    if (/[\u0590-\u05FF]/.test(decoded)) {
                        isIso8859 = true;
                    }
                } catch (error) {
                    console.log('Not ISO-8859-8 encoded:', fsPath, 'Error:', error);
                }
                if (!isIso8859) {
                    console.log('Skipping processing for:', fsPath, 'Reason: Not ISO-8859-8 encoded');
                    return;
                }
                vscode.window.showInformationMessage('ISO-8859-8 file opened: ' + fsPath);
                const utf8Text = iconv.decode(content, 'iso-8859-8');
                // Add LRO to Hebrew segments only
                const modifiedText = utf8Text.replace(/[\u0590-\u05FF]+/g, '\u202D$&');
                console.log('Processing file:', fsPath, 'New content:', modifiedText);

                // Create .freebidi directory if it doesn't exist
                const dir = path.dirname(fsPath);
                const utf8Dir = path.join(dir, '.freebidi');
                if (!fs.existsSync(utf8Dir)) {
                    fs.mkdirSync(utf8Dir, { recursive: false });
                    console.log('Created directory:', utf8Dir);
                } else {
                    console.log('Directory already exists:', utf8Dir);
                }

                // Save to .freebidi/<filename>.cob
                const utf8FilePath = path.join(utf8Dir, path.basename(fsPath));
                fs.writeFileSync(utf8FilePath, modifiedText, 'utf8');
                console.log('Saved UTF-8 file:', utf8FilePath);
                vscode.window.showInformationMessage('Converted and saved as: ' + utf8FilePath);

                // Open the .freebidi file
                const utf8Uri = document.uri.with({ path: utf8FilePath });
                const utf8Doc = await vscode.workspace.openTextDocument(utf8Uri);
                await vscode.window.showTextDocument(utf8Doc);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to process file: ${error}`);
                console.error('Process error:', error);
            }
        })
    );

    // Command for manual conversion
    context.subscriptions.push(
        vscode.commands.registerCommand('free-bidi.convert', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor. Please open a .cob file.');
                console.log('Command error: No active editor');
                return;
            }
            const document = editor.document;
            const fsPath = document.uri.fsPath;
            if (document.languageId !== 'iso88598' || !fsPath.endsWith('.cob') || fsPath.includes('/.freebidi/')) {
                vscode.window.showErrorMessage('Please open a .cob file with iso88598 language ID outside .freebidi directory.');
                console.log('Command error: Invalid file or language ID:', document.languageId, 'Path:', fsPath);
                return;
            }
            try {
                const content = fs.readFileSync(fsPath);
                // Check if file is likely ISO-8859-8 encoded
                let isIso8859 = false;
                try {
                    const decoded = iconv.decode(content, 'iso-8859-8');
                    // Check for Hebrew characters to confirm encoding
                    if (/[\u0590-\u05FF]/.test(decoded)) {
                        isIso8859 = true;
                    }
                } catch (error) {
                    console.log('Not ISO-8859-8 encoded:', fsPath, 'Error:', error);
                }
                if (!isIso8859) {
                    vscode.window.showErrorMessage('File is not ISO-8859-8 encoded.');
                    console.log('Command error: Not ISO-8859-8 encoded:', fsPath);
                    return;
                }
                const utf8Text = iconv.decode(content, 'iso-8859-8');
                // Add LRO to Hebrew segments only
                const modifiedText = utf8Text.replace(/[\u0590-\u05FF]+/g, '\u202D$&');
                console.log('Manual conversion for:', fsPath, 'Text:', modifiedText);

                // Create .freebidi directory if it doesn't exist
                const dir = path.dirname(fsPath);
                const utf8Dir = path.join(dir, '.freebidi');
                if (!fs.existsSync(utf8Dir)) {
                    fs.mkdirSync(utf8Dir, { recursive: false });
                    console.log('Created directory:', utf8Dir);
                } else {
                    console.log('Directory already exists:', utf8Dir);
                }

                // Save to .freebidi/<filename>.cob
                const utf8FilePath = path.join(utf8Dir, path.basename(fsPath));
                fs.writeFileSync(utf8FilePath, modifiedText, 'utf8');
                console.log('Saved UTF-8 file:', utf8FilePath);
                vscode.window.showInformationMessage('Manually converted and saved as: ' + utf8FilePath);

                // Open the .freebidi file
                const utf8Uri = document.uri.with({ path: utf8FilePath });
                const utf8Doc = await vscode.workspace.openTextDocument(utf8Uri);
                await vscode.window.showTextDocument(utf8Doc);
            } catch (error) {
                vscode.window.showErrorMessage(`Manual conversion failed: ${error}`);
                console.error('Manual conversion error:', error);
            }
        })
    );

    // Handle saves for .freebidi/*.cob files: convert to ISO-8859-8, remove LRO, save to original .cob
    context.subscriptions.push(
        vscode.workspace.onWillSaveTextDocument(event => {
            const fsPath = event.document.uri.fsPath;
            if (fsPath.includes('/.freebidi/') && fsPath.endsWith('.cob')) {
                try {
                    const text = event.document.getText();
                    console.log('Saving file:', fsPath, 'Text:', text);
                    // Remove all LRO characters
                    const originalText = text.replace(/\u202D/g, '');
                    // Convert to ISO-8859-8
                    const isoBuffer = iconv.encode(originalText, 'iso-8859-8');
                    // Save to original .cob file
                    const isoFilePath = fsPath.replace(/\.freebidi\//, '');
                    fs.writeFileSync(isoFilePath, isoBuffer);
                    console.log('Saved as ISO-8859-8:', isoFilePath);
                    vscode.window.showInformationMessage('Saved as ISO-8859-8: ' + isoFilePath);
                } catch (error) {
                    vscode.window.showErrorMessage(`Save failed: ${error}`);
                    console.error('Save error:', error);
                }
            }
        })
    );

    // Delete .freebidi/*.cob file when its editor tab is closed
    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(document => {
            const fsPath = document.uri.fsPath;
            console.log('File closed:', fsPath, 'Language ID:', document.languageId);
            if (fsPath.includes('/.freebidi/') && fsPath.endsWith('.cob')) {
                try {
                    // Delay deletion to ensure file is released
                    setTimeout(() => {
                        if (fs.existsSync(fsPath)) {
                            fs.unlinkSync(fsPath);
                            console.log('Deleted UTF-8 file:', fsPath);
                            vscode.window.showInformationMessage('Deleted UTF-8 file: ' + fsPath);
                        } else {
                            console.log('File already deleted or does not exist:', fsPath);
                        }
                    }, 500); // 500ms delay
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to delete file: ${error}`);
                    console.error('Delete error:', error);
                }
            } else {
                console.log('Not deleting:', fsPath, 'Reason: Not a .freebidi/*.cob file');
            }
        })
    );

    // Automatically add LRO before new Hebrew segments in .freebidi/*.cob files
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            const fsPath = event.document.uri.fsPath;
            if (fsPath.includes('/.freebidi/') && fsPath.endsWith('.cob')) {
                console.log('Text changed in:', fsPath);
                const editor = vscode.window.activeTextEditor;
                if (!editor || editor.document.uri.fsPath !== fsPath) {
                    console.log('No active editor or mismatched document for:', fsPath);
                    return;
                }
                try {
                    for (const change of event.contentChanges) {
                        // Check if the change includes Hebrew characters
                        if (/[\u0590-\u05FF]/.test(change.text)) {
                            console.log('Hebrew characters detected in change:', change.text);
                            const edit = new vscode.WorkspaceEdit();
                            const hebrewSegments = change.text.match(/[\u0590-\u05FF]+/g);
                            if (hebrewSegments) {
                                let offset = 0;
                                for (const segment of hebrewSegments) {
                                    const segmentStart = change.text.indexOf(segment, offset);
                                    const position = change.range.start.translate(0, segmentStart);
                                    edit.insert(event.document.uri, position, '\u202D');
                                    console.log('Adding LRO before Hebrew segment:', segment, 'at position:', position);
                                    offset = segmentStart + segment.length;
                                }
                                if (edit.size > 0) {
                                    vscode.workspace.applyEdit(edit);
                                }
                            }
                        }
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to add LRO to Hebrew segment: ${error}`);
                    console.error('LRO insertion error:', error);
                }
            }
        })
    );
}

export function deactivate() {}
