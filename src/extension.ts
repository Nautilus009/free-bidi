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

    // Handle file open
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(async (document) => {
        console.log(`DEBUG: onDidOpenTextDocument triggered, languageId: ${document.languageId}, uri: ${document.uri.fsPath}`);
        if (document.languageId.toLowerCase() === 'cobolit' && document.uri.scheme === 'file' && !document.uri.fsPath.includes(path.sep + '.freebidi' + path.sep)) {
            await convertFile(document.uri, outputChannel);
        }
    }));

    // Handle file save
    context.subscriptions.push(vscode.workspace.onWillSaveTextDocument(async (event) => {
        console.log(`DEBUG: onWillSaveTextDocument triggered, path: ${event.document.uri.fsPath}`);
        if (event.document.uri.fsPath.includes(path.sep + '.freebidi' + path.sep)) {
            await saveOriginalFile(event.document, outputChannel);
        }
    }));

    // Handle file close
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((document) => {
        console.log(`DEBUG: onDidCloseTextDocument triggered, path: ${document.uri.fsPath}`);
        if (document.uri.fsPath.includes(path.sep + '.freebidi' + path.sep)) {
            try {
                fs.unlinkSync(document.uri.fsPath);
                outputChannel.appendLine(`Deleted temporary file: ${document.uri.fsPath}`);
            } catch (err: any) {
                outputChannel.appendLine(`Error deleting temporary file ${document.uri.fsPath}: ${err.message}`);
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

            // Open the converted file and set encoding to UTF-8
            const doc = await vscode.workspace.openTextDocument(outPath);
            await vscode.window.showTextDocument(doc);
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
