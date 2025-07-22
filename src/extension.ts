import * as vscode from 'vscode';

const outputChannel = vscode.window.createOutputChannel('Region Folding Utilities');

export function activate(context: vscode.ExtensionContext) {  
  registerAddLinesCountCommand(context);
  registerFoldAllRegionsCommand(context);
  registerUnfoldAllRegionsCommand(context);
  registerFoldAndSyncRegionsCommand(context);
}

// Create a function that call the addLinesCount command and the fold command
function registerFoldAndSyncRegionsCommand(context: vscode.ExtensionContext) {
  const syncLinesCountAndFoldAllRegionsDisposable = vscode.commands.registerCommand('extension.syncandfoldregions', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor found.');
      return;
    }

    // Utilise les autres commandes d'extension pour combiner en une seule commande
    try {
      await vscode.commands.executeCommand('extension.addlinescounttoregions');
      await vscode.commands.executeCommand('extension.foldallregions');
    } catch (error) {
      vscode.window.showErrorMessage(`Error while syncing and folding regions: ${error}`);
      outputChannel.appendLine(`Error: ${error}`);
    }

    vscode.window.showInformationMessage('All regions have been folded and their line counts updated.');
  });

  context.subscriptions.push(syncLinesCountAndFoldAllRegionsDisposable);
}
function registerAddLinesCountCommand(context: vscode.ExtensionContext) {
  const addLinesCountDisposable = vscode.commands.registerCommand('extension.addlinescounttoregions', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'sql') {
      vscode.window.showInformationMessage('No active SQL editor found.');
      return;
    }

    const document = editor.document;
    // Regex amélioré pour capturer correctement le nom de la région et supprimer l'ancien count s'il existe
    const regexStart = /^(\s*)--\s*#region\s+(.*?)\s*(?:\(\d+\s*lines?\s*inside\))?\s*$/i;
    const regexEnd = /^(\s*)--\s*#endregion\s*.*?$/i;
    
    let modifications: { line: number; newText: string }[] = [];
    let foundPairs = 0;

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const startMatch = line.text.match(regexStart);
      
      if (startMatch) {
        let endLineIndex = -1;
        for (let j = i + 1; j < document.lineCount; j++) {
          const endLine = document.lineAt(j);
          if (regexEnd.test(endLine.text)) {
            endLineIndex = j;
            break;
          }
        }
        
        if (endLineIndex !== -1) {
          // Calculer le nombre de lignes entre start et end (exclusif)
          const linesInside = endLineIndex - i - 1;
          
          // Extraire les parties de la ligne
          const indentation = startMatch[1]; // Préserver l'indentation
          const regionName = startMatch[2].trim() || 'section debug';
          
          // Créer le nouveau texte pour la ligne de début
          const newStartText = `${indentation}-- #region ${regionName} (${linesInside} lines inside)`;
          
          // Vérifier si le texte a changé avant d'ajouter une modification
          if (newStartText !== line.text) {
            modifications.push({
              line: i,
              newText: newStartText
            });
          }
          
          foundPairs++;
        }
      }
    }

    if (modifications.length === 0) {
      vscode.window.showInformationMessage(`Found ${foundPairs} debug sections, but all already have correct line counts.`);
      return;
    }

    // Appliquer toutes les modifications
    const edit = new vscode.WorkspaceEdit();
    
    for (const mod of modifications) {
      const line = document.lineAt(mod.line);
      const range = new vscode.Range(line.range.start, line.range.end);
      edit.replace(document.uri, range, mod.newText);
    }

    const success = await vscode.workspace.applyEdit(edit);
    
    if (success) {
      vscode.window.showInformationMessage(`Updated ${modifications.length} debug section(s) with line counts.`);
    } else {
      vscode.window.showErrorMessage('Failed to update debug sections.');
    }
  });

  context.subscriptions.push(addLinesCountDisposable);
}
// function registerAddLinesCountCommand(context: vscode.ExtensionContext) {
//   const addLinesCountDisposable = vscode.commands.registerCommand('extension.addlinescounttoregions', async () => {
//     const editor = vscode.window.activeTextEditor;
//     if (!editor || editor.document.languageId !== 'sql') {
//       vscode.window.showInformationMessage('No active SQL editor found.');
//       return;
//     }

//     const document = editor.document;
//     const regexStart = /^(.*)--\s*#region\s*.*?(?:\s*\([^)]*\))?\s*(.*)$/i;
//     const regexEnd = /^(.*)--\s*#endregion\s*.*?\s*(.*)$/i;
    
//     let modifications: { line: number; newText: string }[] = [];
//     let foundPairs = 0;

//     for (let i = 0; i < document.lineCount; i++) {
//       const line = document.lineAt(i);
//       const startMatch = line.text.match(regexStart);
      
//       if (startMatch) {
//         let endLineIndex = -1;
//         for (let j = i + 1; j < document.lineCount; j++) {
//           const endLine = document.lineAt(j);
//           if (regexEnd.test(endLine.text)) {
//             endLineIndex = j;
//             break;
//           }
//         }
        
//         if (endLineIndex !== -1) {
//           // Calculer le nombre de lignes entre start et end (exclusif)
//           const linesInside = endLineIndex - i - 1;
          
//           // Créer le nouveau texte pour la ligne de début
//           const beforeComment = startMatch[1];
//           const afterComment = startMatch[2];
//           const newStartText = `${beforeComment}-- #region section debug (${linesInside} lines inside)${afterComment}`;
          
//           // Vérifier si le texte a changé avant d'ajouter une modification
//           if (newStartText !== line.text) {
//             modifications.push({
//               line: i,
//               newText: newStartText
//             });
//           }
          
//           foundPairs++;
//         }
//       }
//     }

//     if (modifications.length === 0) {
//       vscode.window.showInformationMessage(`Found ${foundPairs} debug sections, but all already have line counts.`);
//       return;
//     }

//     // Appliquer toutes les modifications
//     const edit = new vscode.WorkspaceEdit();
    
//     for (const mod of modifications) {
//       const line = document.lineAt(mod.line);
//       const range = new vscode.Range(line.range.start, line.range.end);
//       edit.replace(document.uri, range, mod.newText);
//     }

//     const success = await vscode.workspace.applyEdit(edit);
    
//     if (success) {
//       vscode.window.showInformationMessage(`Updated ${modifications.length} debug section(s) with line counts.`);
//     } else {
//       vscode.window.showErrorMessage('Failed to update debug sections.');
//     }
//   });

//   context.subscriptions.push(addLinesCountDisposable);
// }

function registerFoldAllRegionsCommand(context: vscode.ExtensionContext) {
  const foldAllRegionsDisposable = vscode.commands.registerCommand('extension.foldallregions', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor found.');
      return;
    }

    // Utilise la commande native de VS Code pour plier toutes les régions
    await vscode.commands.executeCommand('editor.foldAllBlockComments');
    await vscode.commands.executeCommand('editor.foldAllMarkerRegions');
    
    vscode.window.showInformationMessage('All regions have been folded.');
  });

  context.subscriptions.push(foldAllRegionsDisposable);
}

function registerUnfoldAllRegionsCommand(context: vscode.ExtensionContext) {
  const unfoldAllRegionsDisposable = vscode.commands.registerCommand('extension.unfoldallregions', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor found.');
      return;
    }

    // Utilise la commande native de VS Code pour déplier toutes les régions
    await vscode.commands.executeCommand('editor.unfoldAll');
    
    vscode.window.showInformationMessage('All regions have been unfolded.');
  });

  context.subscriptions.push(unfoldAllRegionsDisposable);
}
