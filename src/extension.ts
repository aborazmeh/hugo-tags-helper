import * as vscode from 'vscode';
import * as fs from 'fs';
import * as readline from 'readline'
import { HugoTagsHelperProvider } from './HugoTagsHelperProvider';

export const knownHugoTagsKey = "knownHugoTags"
const hugoTagsLastUpdatedKey = 'hugoTagsLastUpdated'

export async function activate(context: vscode.ExtensionContext) {
	const lastGenerated = context.workspaceState.get<Date>(hugoTagsLastUpdatedKey, new Date(0))
	const currentDate = new Date();
	const lastWeek = new Date(currentDate.setDate(currentDate.getDate() - 7))
	if (lastGenerated < lastWeek) {
		await generateTagList(context)
	}

	context.subscriptions.push(
		vscode.commands.registerCommand("hugo-tags-helper.regenerateTags", async () => await generateTagList(context))
	)

	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider('markdown', new HugoTagsHelperProvider(context.workspaceState), '"', "'")
	)
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

		const files = await vscode.workspace.findFiles("**/index.md")
		const allTags = new Set<string>();
		for (let f of files) {
			const tags = await getTags(f.fsPath)
			tags.forEach(t => allTags.add(t))
		}

		const strings = Array.from(allTags)
		await context.workspaceState.update(knownHugoTagsKey, strings)
		await context.workspaceState.update(hugoTagsLastUpdatedKey, new Date())

		progress.report({message: 'Finished!'})
	})
}

async function getTags(filePath: string) {
	let allTags = new Set<string>();
	const stream = fs.createReadStream(filePath)
	const readInterface = readline.createInterface(stream)
	try {
		let index = 0
		for await (const line of readInterface) {
			// Note yaml only
			if (index === 0 && !line.startsWith('---')) {
				// No frontmatter
				return new Set<string>();
			} else if (index !== 0 && line.startsWith('---')) {
				// End of frontmatter, didn't find tags
				return new Set<string>();
			}

			const isTagLine = line.trim().startsWith('tags:')
			if (isTagLine) {
				const tags = line
					.split('[')
					.slice(1)[0]
					.replace("]", "")
					.split(',')
					.map(x => x.replaceAll('"', '').replace("'", "").trim())

				allTags = new Set<string>(tags)
				return allTags;
			}

			index++;
		}
		return allTags;
	}
	finally {
		stream.destroy(); // Destroy file stream.
	}
}

