import * as vscode from 'vscode';

const outputChannel = vscode.window.createOutputChannel('Region Folding Utilities');

// Fonction utilitaire pour compter les lignes dans toutes les régions
function countLinesInAllRegions(document: vscode.TextDocument): number {
  const regexStart = /^(\s*)--\s*#region\s+(.*?)\s*(?:\(\d+\s*lines?\s*inside\))?\s*$/i;
  const regexEnd = /^(\s*)--\s*#endregion\s*.*?$/i;
  
  let totalLines = 0;

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
        const linesInside = endLineIndex - i - 1;
        totalLines += linesInside;
      }
    }
  }

  return totalLines;
}

export function activate(context: vscode.ExtensionContext) {  
  registerAddLinesCountCommand(context);
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

    try {
      // Executer directement la logique de mise à jour des compteurs sans afficher de message
      const document = editor.document;
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
            const linesInside = endLineIndex - i - 1;
            const indentation = startMatch[1];
            const regionName = startMatch[2].trim() || 'section debug';
            const newStartText = `${indentation}-- #region ${regionName} (${linesInside} lines inside)`;
            
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

      // Appliquer les modifications si nécessaires
      if (modifications.length > 0) {
        const edit = new vscode.WorkspaceEdit();
        for (const mod of modifications) {
          const line = document.lineAt(mod.line);
          const range = new vscode.Range(line.range.start, line.range.end);
          edit.replace(document.uri, range, mod.newText);
        }
        await vscode.workspace.applyEdit(edit);
      }

      // Plier toutes les régions
      await vscode.commands.executeCommand('editor.foldAllBlockComments');
      await vscode.commands.executeCommand('editor.foldAllMarkerRegions');
      
      // Compter et afficher le total de lignes pliées
      const totalLinesFolded = countLinesInAllRegions(editor.document);
      vscode.window.showInformationMessage(`All regions synchronized and folded. Total lines folded: ${totalLinesFolded}`);
      
    } catch (error) {
      vscode.window.showErrorMessage(`Error while syncing and folding regions: ${error}`);
      outputChannel.appendLine(`Error: ${error}`);
    }
  });

  context.subscriptions.push(syncLinesCountAndFoldAllRegionsDisposable);
}
function registerAddLinesCountCommand(context: vscode.ExtensionContext) {
  const addLinesCountDisposable = vscode.commands.registerCommand('extension.addlinescounttoregions', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor found.');
      return;
    }

    const document = editor.document;
    // Regex amélioré pour capturer correctement le nom de la région et supprimer l'ancien count s'il existe
    const regexStart = /^(\s*)--\s*#region\s+(.*?)\s*(?:\(\d+\s*lines?\s*inside\))?\s*$/i;
    const regexEnd = /^(\s*)--\s*#endregion\s*.*?$/i;
    
    let modifications: { line: number; newText: string }[] = [];
    let foundPairs = 0;
    let totalLinesInAllRegions = 0;

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

          // Ajouter au total de toutes les régions (modifiées ou non)
          totalLinesInAllRegions += linesInside;

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
      vscode.window.showInformationMessage(`Total lines in regions: ${totalLinesInAllRegions}`);
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
      vscode.window.showInformationMessage(`Updated ${modifications.length} debug section(s) with line counts. Total lines in regions: ${totalLinesInAllRegions}`);
    } else {
      vscode.window.showErrorMessage('Failed to update region sections with line counts.');
    }
  });

  context.subscriptions.push(addLinesCountDisposable);
}

/// This function was merge to the Sync & Fold command
/// It is no longer needed as a separate command, but kept here for reference.
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

    let totalLinesInAllRegions = countLinesInAllRegions(editor.document);
    // Utilise la commande native de VS Code pour déplier toutes les régions
    await vscode.commands.executeCommand('editor.unfoldAll');

    vscode.window.showInformationMessage(`All regions have been unfolded. Total lines unfolded: ${totalLinesInAllRegions}`);

  });

  context.subscriptions.push(unfoldAllRegionsDisposable);
}
