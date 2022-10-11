import {
	Indexer,
	type LinklistEntity,
	type NoteEntity,
	type LinkEntity,
} from "crossbell.js";
import JSZip from "jszip";

const indexer = new Indexer();

export async function exportDataOfCharacter(
	handle: string,
	{
		onProgress,
		exportNotesInMarkdown = false,
	}: {
		onProgress: (progress: number, statusText: string) => void;
		exportNotesInMarkdown: boolean;
	}
) {
	onProgress(0, "Fetching character data...");
	const character = await indexer.getCharacterByHandle(handle);
	if (!character) {
		throw new Error("Character not found");
	}

	onProgress(0.2, "Fetching character's linklists...");
	let linklists: LinklistEntity[] = [];
	while (true) {
		const linklistsCurPage = await indexer.getLinklistsByCharacter(
			character.characterId,
			{ limit: 1000 }
		);
		linklists = linklists.concat(linklistsCurPage.list);
		if (!linklistsCurPage.cursor) {
			break;
		}
	}

	onProgress(0.4, "Fetching character's links...");
	const links: Record<string, LinkEntity[]> = {};
	for (let i = 0; i < linklists.length; i++) {
		const linklist = linklists[i];
		let _links: LinkEntity[] = [];

		while (true) {
			const linksCurPage = await indexer.getLinks(character.characterId, {
				linkType: linklist.linkType,
				limit: 1000,
			});
			_links = _links.concat(linksCurPage.list);
			if (!linksCurPage.cursor) {
				break;
			}
		}
		links[linklist.linkType] = _links;
		onProgress(
			0.4 + (i / linklists.length) * 0.2,
			`Fetching character's links... (${i + 1}/${linklists.length})`
		);
	}

	onProgress(0.6, "Fetching character's notes...");
	let notes: NoteEntity[] = [];
	while (true) {
		const notesCurPage = await indexer.getNotes({
			characterId: character.characterId,
			limit: 1000,
		});
		notes = notes.concat(notesCurPage.list);
		const total = notesCurPage.count;
		onProgress(
			0.6 + (notes.length / total) * 0.2,
			`Fetching character's notes... (${notes.length}/${total})`
		);
		if (!notesCurPage.cursor) {
			break;
		}
	}

	onProgress(0.8, "Compressing data...");
	const zip = new JSZip();
	const characterFolder = zip.folder("character");
	if (!characterFolder) throw new Error("Failed to compress data (character)");
	characterFolder.file("character.json", JSON.stringify(character));
	const linklistsFolder = zip.folder("linklists");
	if (!linklistsFolder) throw new Error("Failed to compress data (linklists)");
	linklistsFolder.file("linklists.json", JSON.stringify(linklists));
	Object.entries(links).forEach(([linkType, _links]) => {
		const linkFolder = linklistsFolder.folder(linkType);
		if (!linkFolder)
			throw new Error(`Failed to compress data (links/${linkType})`);
		linkFolder.file("links.json", JSON.stringify(_links));
	});
	const notesFolder = zip.folder("notes");
	if (!notesFolder) throw new Error("Failed to compress data (notes)");
	notes.forEach((note, i) => {
		notesFolder.file(`${i}.json`, JSON.stringify(note));
	});
	if (exportNotesInMarkdown) {
		const notesFolder2 = zip.folder("notes-markdown");
		if (!notesFolder2)
			throw new Error("Failed to compress data (notes-markdown)");
		notes.forEach((note, i) => {
			let content = note.metadata?.content?.content ?? "";
			if (note.metadata?.content?.attachments) {
				note.metadata.content.attachments.forEach((attachment) => {
					content += `

![${attachment.alt}](${attachment.address ?? attachment.content})`;
				});
			}
			notesFolder2.file(`${i}.md`, content);
		});
	}
	await zip.generateAsync({ type: "blob" }).then((blob) => {
		downloadFile(blob, `${handle}.zip`);
	});

	onProgress(1, "Done");
}

function downloadFile(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
}
