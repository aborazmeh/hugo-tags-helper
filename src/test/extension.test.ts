import * as assert from "assert";
import { getTagsFromReadStream } from "../extension";

suite("getTagsFromReadStream", () => {
	test("extracts tags from single-line frontmatter", async () => {
		const lines = ["---", 'tags: [ "tag1", "tag2", "tag3" ]', "---"];
		const result = await getTagsFromReadStream(lines.join("\n"));
		assert.deepStrictEqual(result, ["tag1", "tag2", "tag3"]);
	});

	test("returns empty if no frontmatter", async () => {
		const lines = ["no tags here"];
		const result = await getTagsFromReadStream(lines.join("\n"));
		assert.deepStrictEqual(result, []);
	});

	test("extracts multiline tag arrays", async () => {
		const lines = ["---", "tags: [", '"tag1",', '"tag2",', '"tag3"', "]", "---"];
		const result = await getTagsFromReadStream(lines.join("\n"));
		assert.deepStrictEqual(result, ["tag1", "tag2", "tag3"]);
	});

	test("returns empty if frontmatter ends before tag block", async () => {
		const lines = ["---", 'title: "test"', "---", 'tags: [ "tag1" ]'];
		const result = await getTagsFromReadStream(lines.join("\n"));
		assert.deepStrictEqual(result, []);
	});
});
