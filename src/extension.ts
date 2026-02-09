import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as iconv from 'iconv-lite';

export function activate(context: vscode.ExtensionContext) {
    console.log('DEBUG: Entering activate function for free-bidi');
    const outputChannel = vscode.window.createOutputChannel('free-bidi');
    outputChannel.appendLine('Free Bidi extension activated on platform: ' + process.platform);
    console.log('DEBUG: Output channel created for free-bidi, platform: ' + process.platform);

    // Register command for manual conversion
    context.subscriptions.push(vscode.commands.registerCommand('free-bidi.convert', async () => {
        console.log('DEBUG: Executing free-bidi.convert command');
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId.toLowerCase() !== 'iso88598') {
            vscode.window.showErrorMessage('Open a file with iso88598 language ID to convert.');
            return;
        }
        await convertFile(editor.document.uri, outputChannel);
    }));

    // Handle active editor change to intercept file opening
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(async (editor) => {
        if (!editor) return;

        const document = editor.document;
        console.log(`DEBUG: onDidChangeActiveTextEditor triggered, languageId: ${document.languageId}, uri: ${document.uri.fsPath}`);

        if (document.languageId.toLowerCase() === 'cobolit' && document.uri.scheme === 'file' && !document.uri.fsPath.includes(path.sep + '.freebidi' + path.sep)) {
            const filePath = document.uri.fsPath;
            const freeBidiPath = path.join(path.dirname(filePath), '.freebidi', path.basename(filePath));

            // Check if freebidi version already exists
            if (fs.existsSync(freeBidiPath)) {
                outputChannel.appendLine(`Found existing freebidi: ${freeBidiPath}`);

                // Wait a bit for VSCode to navigate to the requested line
                setTimeout(async () => {
                    try {
                        // Capture the current position after VSCode has navigated
                        const currentEditor = vscode.window.activeTextEditor;
                        if (!currentEditor || currentEditor.document.uri.fsPath !== filePath) {
                            // Editor changed, don't proceed
                            return;
                        }

                        const viewColumn = currentEditor.viewColumn;
                        const selection = currentEditor.selection;

                        outputChannel.appendLine(`Capturing selection at line ${selection.start.line + 1}`);

                        // Open freebidi document with the same selection
                        const freeBidiDoc = await vscode.workspace.openTextDocument(freeBidiPath);
                        const freeBidiEditor = await vscode.window.showTextDocument(freeBidiDoc, {
                            viewColumn: viewColumn,
                            preview: false,
                            selection: selection
                        });

                        // Ensure the cursor position is set
                        freeBidiEditor.selection = selection;
                        freeBidiEditor.revealRange(selection, vscode.TextEditorRevealType.InCenterIfOutsideViewport);

                        // Close the original tab
                        const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs);
                        const originalTab = tabs.find(tab =>
                            tab.input instanceof vscode.TabInputText &&
                            tab.input.uri.fsPath === filePath
                        );

                        if (originalTab) {
                            try {
                                await vscode.window.tabGroups.close(originalTab);
                                outputChannel.appendLine(`Closed original file tab: ${filePath}`);
                            } catch (closeErr: any) {
                                // Tab might already be closed or invalid, log but continue
                                outputChannel.appendLine(`Note: Could not close original tab (${closeErr.message}), may already be closed`);
                            }
                        }

                        outputChannel.appendLine(`Opened freebidi at line ${selection.start.line + 1}`);
                    } catch (err: any) {
                        outputChannel.appendLine(`Error opening existing freebidi file: ${err.message}`);
                    }
                }, 100);
            }
        }
    }));

    // Handle file open for conversion (when freebidi doesn't exist yet)
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(async (document) => {
        console.log(`DEBUG: onDidOpenTextDocument triggered, languageId: ${document.languageId}, uri: ${document.uri.fsPath}`);
        if (document.languageId.toLowerCase() === 'cobolit' && document.uri.scheme === 'file' && !document.uri.fsPath.includes(path.sep + '.freebidi' + path.sep)) {
            const filePath = document.uri.fsPath;
            const freeBidiPath = path.join(path.dirname(filePath), '.freebidi', path.basename(filePath));

            // Only convert if freebidi version doesn't exist (opening handled by onDidChangeActiveTextEditor)
            if (!fs.existsSync(freeBidiPath)) {
                await convertFile(document.uri, outputChannel);
            }
        }
    }));

    // Handle file save
    context.subscriptions.push(vscode.workspace.onWillSaveTextDocument(async (event) => {
        console.log(`DEBUG: onWillSaveTextDocument triggered, path: ${event.document.uri.fsPath}`);
        if (event.document.uri.fsPath.includes(path.sep + '.freebidi' + path.sep)) {
            await saveOriginalFile(event.document, outputChannel);
        }
    }));

    // Handle tab close using Tab Groups API
    context.subscriptions.push(vscode.window.tabGroups.onDidChangeTabs((event) => {
        console.log(`DEBUG: onDidChangeTabs triggered`);
        // Check for closed tabs
        for (const tab of event.closed) {
            if (tab.input instanceof vscode.TabInputText) {
                const filePath = tab.input.uri.fsPath;
                console.log(`DEBUG: Tab closed: ${filePath}`);

                if (filePath.includes(path.sep + '.freebidi' + path.sep)) {
                    outputChannel.appendLine(`Freebidi tab closed: ${filePath}`);
                    // Add a small delay to ensure file handles are released
                    setTimeout(() => {
                        try {
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                                outputChannel.appendLine(`Deleted temporary file: ${filePath}`);
                            } else {
                                outputChannel.appendLine(`File already deleted: ${filePath}`);
                            }
                        } catch (err: any) {
                            outputChannel.appendLine(`Error deleting temporary file ${filePath}: ${err.message}`);
                            // Retry once after another delay
                            setTimeout(() => {
                                try {
                                    if (fs.existsSync(filePath)) {
                                        fs.unlinkSync(filePath);
                                        outputChannel.appendLine(`Deleted temporary file on retry: ${filePath}`);
                                    }
                                } catch (retryErr: any) {
                                    outputChannel.appendLine(`Failed to delete on retry ${filePath}: ${retryErr.message}`);
                                }
                            }, 500);
                        }
                    }, 100);
                }
            }
        }
    }));

    // Handle text changes to insert LRO before Hebrew characters in .freebidi files
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(async (event) => {
        const document = event.document;
        if (!document.uri.fsPath.includes(path.sep + '.freebidi' + path.sep)) {
            return;
        }
        console.log(`DEBUG: onDidChangeTextDocument triggered for ${document.uri.fsPath}`);

        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document !== document) {
            return;
        }

        const edits: vscode.TextEdit[] = [];
        for (const change of event.contentChanges) {
            const text = change.text;
            if (/[\u0590-\u05FF]/.test(text)) {
                // Insert \u202D before the Hebrew text
                const position = change.range.start;
                edits.push(vscode.TextEdit.insert(position, '\u202D'));
                outputChannel.appendLine(`Inserted LRO before Hebrew text at position ${position.line}:${position.character}`);
            }
        }

        if (edits.length > 0) {
            const workspaceEdit = new vscode.WorkspaceEdit();
            workspaceEdit.set(document.uri, edits);
            await vscode.workspace.applyEdit(workspaceEdit);
        }
    }));
}

async function convertFile(uri: vscode.Uri, outputChannel: vscode.OutputChannel) {
    const filePath = uri.fsPath;
    console.log(`DEBUG: convertFile called for ${filePath}`);
    if (!filePath.toLowerCase().endsWith('.cob')) {
        outputChannel.appendLine(`Skipping non-COBOL file: ${filePath}`);
        return;
    }

    try {
        const content = fs.readFileSync(filePath);
        // Try ISO-8859-8 first, then windows-1255
        let text: string;
        let encodingUsed: string = 'ISO-8859-8';
        try {
            text = iconv.decode(content, 'ISO-8859-8');
            if (!/[\u0590-\u05FF]/.test(text)) {
                throw new Error('No Hebrew characters detected');
            }
        } catch (err) {
            outputChannel.appendLine(`ISO-8859-8 decoding failed for ${filePath}: ${err}, trying windows-1255`);
            text = iconv.decode(content, 'windows-1255');
            encodingUsed = 'windows-1255';
            if (!/[\u0590-\u05FF]/.test(text)) {
                outputChannel.appendLine(`No Hebrew characters in windows-1255 for ${filePath}`);
                return;
            }
        }

        // Add LRO markers to Hebrew text
        const newContent = text.replace(/([\u0590-\u05FF]+)/g, '\u202D$1');
        outputChannel.appendLine(`Processing file: ${filePath} (encoding: ${encodingUsed}) New content: ${newContent}`);

        // Save to .freebidi directory with UTF-8 BOM
        const freeBidiDir = path.join(path.dirname(filePath), '.freebidi');
        const outPath = path.join(freeBidiDir, path.basename(filePath));
        try {
            if (!fs.existsSync(freeBidiDir)) {
                fs.mkdirSync(freeBidiDir, { recursive: true });
            }
            // Write with UTF-8 BOM
            const utf8Bom = Buffer.from([0xEF, 0xBB, 0xBF]);
            const encodedContent = iconv.encode(newContent, 'UTF-8');
            fs.writeFileSync(outPath, Buffer.concat([utf8Bom, encodedContent]));
            outputChannel.appendLine(`Saved UTF-8 file with BOM: ${outPath}`);

            // Wait for VSCode to navigate to the requested line before capturing position
            setTimeout(async () => {
                try {
                    // Open the converted file and set encoding to UTF-8
                    // Find the original editor position after VSCode has navigated
                    const originalEditor = vscode.window.visibleTextEditors.find(
                        editor => editor.document.uri.fsPath === filePath
                    );
                    const viewColumn = originalEditor?.viewColumn;
                    const selection = originalEditor?.selection;

                    outputChannel.appendLine(`Converting - capturing selection at line ${selection?.start.line ?? 0 + 1}`);

                    // Find the original tab
                    const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs);
                    const originalTab = tabs.find(tab =>
                        tab.input instanceof vscode.TabInputText &&
                        tab.input.uri.fsPath === filePath
                    );

                    const doc = await vscode.workspace.openTextDocument(outPath);
                    const freeBidiEditor = await vscode.window.showTextDocument(doc, {
                        viewColumn: viewColumn,
                        preview: false,
                        selection: selection
                    });

                    // Ensure the cursor position is set
                    if (selection) {
                        freeBidiEditor.selection = selection;
                        freeBidiEditor.revealRange(selection, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
                        outputChannel.appendLine(`Opened converted freebidi at line ${selection.start.line + 1}`);
                    }

                    // Close the original file tab after opening freebidi
                    if (originalTab) {
                        try {
                            await vscode.window.tabGroups.close(originalTab);
                            outputChannel.appendLine(`Closed original file tab: ${filePath}`);
                        } catch (closeErr: any) {
                            // Tab might already be closed or invalid, log but continue
                            outputChannel.appendLine(`Note: Could not close original tab (${closeErr.message}), may already be closed`);
                        }
                    }
                } catch (err: any) {
                    outputChannel.appendLine(`Error in delayed freebidi opening: ${err.message}`);
                }
            }, 100);
        } catch (err: any) {
            outputChannel.appendLine(`Error saving or opening ${outPath}: ${err.message}`);
            vscode.window.showErrorMessage(`Failed to convert ${path.basename(filePath)}: ${err.message}`);
        }
    } catch (err: any) {
        outputChannel.appendLine(`Error processing ${filePath}: ${err.message}`);
        vscode.window.showErrorMessage(`Failed to convert ${path.basename(filePath)}: ${err.message}`);
    }
}

async function saveOriginalFile(document: vscode.TextDocument, outputChannel: vscode.OutputChannel) {
    const tempPath = document.uri.fsPath;
    const originalPath = path.join(path.dirname(path.dirname(tempPath)), path.basename(tempPath));

    try {
        const content = document.getText();
        // Remove LRO markers
        const originalContent = content.replace(/\u202D/g, '');
        fs.writeFileSync(originalPath, iconv.encode(originalContent, 'ISO-8859-8'));
        outputChannel.appendLine(`Saved original file: ${originalPath}`);
    } catch (err: any) {
        outputChannel.appendLine(`Error saving original file ${originalPath}: ${err.message}`);
        vscode.window.showErrorMessage(`Failed to save ${path.basename(originalPath)}: ${err.message}`);
    }
}

export function deactivate() {}
