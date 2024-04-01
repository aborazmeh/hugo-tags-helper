import * as vscode from 'vscode';
import { knownHugoTagsKey } from './extension';

export class HugoTagsHelperProvider implements vscode.CompletionItemProvider {
	private workspaceState: vscode.Memento;

	constructor(state: vscode.Memento) {
		this.workspaceState = state;
	}

	provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
		const line = document.lineAt(position.line);
		const isTagLine = line.text.startsWith('tags:');
		if (!isTagLine) return [];

		const tags = this.workspaceState.get<string[]>(knownHugoTagsKey, []);
		const completionItems = tags.map(t => new vscode.CompletionItem(t, vscode.CompletionItemKind.Enum));
		return Promise.resolve(completionItems);
	}
}
