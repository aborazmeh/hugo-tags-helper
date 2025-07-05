import * as vscode from 'vscode';
import * as fs from 'fs';
import matter from 'gray-matter';
import { HugoTagsHelperProvider } from './HugoTagsHelperProvider';

export const knownHugoTagsKey = "knownHugoTags";
const hugoTagsLastUpdatedKey = 'hugoTagsLastUpdated';

export async function activate(context: vscode.ExtensionContext) {
	const lastGenerated = context.workspaceState.get<Date>(hugoTagsLastUpdatedKey, new Date(0));
	const currentDate = new Date();
	const lastWeek = new Date(currentDate.setDate(currentDate.getDate() - 7));
	if (lastGenerated < lastWeek) {
		await generateTagList(context);
	}

	context.subscriptions.push(
		vscode.commands.registerCommand("hugo-tags-helper.regenerateTags", async () => await generateTagList(context))
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("hugo-tags-helper.test", async () => {
			const tags = await getTagsFromFile(vscode.window.activeTextEditor?.document.uri.fsPath ?? "");
			console.log('RESULT', tags);
		})
	);

	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider('markdown', new HugoTagsHelperProvider(context.workspaceState), '"', "'")
	);
}

async function generateTagList(context: vscode.ExtensionContext) {
	await vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: "Finding Hugo tags...",
		cancellable: true,
	}, async (progress, token) => {
		token.onCancellationRequested(() => {
			console.log("User canceled the long running operation");
		});

		const files = await vscode.workspace.findFiles("**/index.md");
		const allTags = new Set<string>();
		for (let f of files) {
			if (token.isCancellationRequested) {
				break;
			}
			const tags = await getTagsFromFile(f.fsPath);
			tags.forEach(t => allTags.add(t));
		}

		const strings = Array.from(allTags);
		await context.workspaceState.update(knownHugoTagsKey, strings);
		await context.workspaceState.update(hugoTagsLastUpdatedKey, new Date());

		progress.report({message: 'Finished!'});
	});
}

export async function getTagsFromReadStream(content: string): Promise<string[]> {
	const { data } = matter(content);

	if (data && data.tags) {
		return Array.isArray(data.tags) ? data.tags : [data.tags];
	}

	return [];
}

async function getTagsFromFile(filePath: string): Promise<string[]> {
	const fileContent = fs.readFileSync(filePath, 'utf8');
	return getTagsFromReadStream(fileContent);
}
