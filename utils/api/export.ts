import { ipfsFetch, isIpfsUrl } from "@crossbell/ipfs-fetch";
import {
	Indexer,
	type LinklistEntity,
	type NoteEntity,
	type LinkEntity,
} from "crossbell.js";
import JSZip from "jszip";
import yaml from "yaml";

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
		const linklistsCurPage = await indexer.getLinklistsOfCharacter(
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
	notes.forEach((note) => {
		notesFolder.file(
			`${note.characterId}-${note.noteId}.json`,
			JSON.stringify(note)
		);
	});
	if (exportNotesInMarkdown) {
		const notesFolder2 = zip.folder("notes-markdown");
		if (!notesFolder2)
			throw new Error("Failed to compress data (notes-markdown)");

		for (let i = 0; i < notes.length; i++) {
			const note = notes[i];
			await saveNoteInMarkdown(note, notesFolder2);

			onProgress(
				0.8 + (i / notes.length) * 0.2,
				`Fetching note's medias... (${i + 1}/${notes.length})`
			);
		}
	}
	await zip.generateAsync({ type: "blob" }).then((blob) => {
		downloadFile(blob, `${handle}.zip`);
	});

	onProgress(1, "Done");
}

async function saveNoteInMarkdown(note: NoteEntity, folder: JSZip) {
	let md = note.metadata?.content?.content ?? "";
	if (note.metadata?.content?.title) {
		md = `# ${note.metadata.content.title}

${md}`;
	}

	// append attachments
	if (note.metadata?.content?.attachments) {
		note.metadata.content.attachments.forEach((attachment) => {
			if (attachment.mime_type?.startsWith("image/")) {
				md += `\n\n![${attachment.alt ?? ""}](${
					attachment.address ?? attachment.content
				})`;
			} else if (attachment.mime_type?.startsWith("video/")) {
				md += `\n\n<video src="${
					attachment.address ?? attachment.content
				}" controls></video>`;
			} else if (attachment.mime_type?.startsWith("audio/")) {
				md += `\n\n<audio src="${
					attachment.address ?? attachment.content
				}" controls></audio>`;
			} else {
				md += `\n\n[${attachment.alt ?? ""}](${
					attachment.address ?? attachment.content
				})`;
			}
		});
		note.metadata.content.attachments;
	}

	// convert all links to relative links
	const { content: newContent, mediaLinks } = convertMediaLinks(md);

	const title = (
		note.metadata?.content?.title ||
		md.trim().split("\n")[0].replace("#", "")?.trim().slice(0, 50) ||
		"note"
	).replace(/\/|\\|\?|%|\*|:|\||"|<|>/g, "_");

	md = newContent;

	// prepend metadata to frontmatter
	const frontmatter = {
		...note.metadata?.content,
		content: undefined,
		attachments: undefined,
	};
	md =
		`---
${yaml.stringify(frontmatter)}
---\n\n` + md;

	// create note floder
	const noteFolder = folder.folder(
		`${note.characterId}-${note.noteId} - ${title}`
	);
	if (!noteFolder) throw new Error("Failed to compress data (note)");

	// save attachments
	if (mediaLinks.length > 0) {
		const attachmentsFolder = noteFolder.folder("attachments");
		if (!attachmentsFolder)
			throw new Error("Failed to compress data (attachments)");

		await Promise.all(
			mediaLinks.map(async (mediaLink) => {
				const fileName = mediaLink.split("/").pop();
				if (!fileName) return;
				try {
					const res = isIpfsUrl(mediaLink)
						? await ipfsFetch(mediaLink)
						: await fetch(mediaLink);
					const data = await res.blob();
					const fileType = data.type.split("/").pop();
					attachmentsFolder.file(`${fileName}.${fileType}`, data);
					md = md.replaceAll(
						`./attachments/${fileName}`,
						`./attachments/${fileName}.${fileType}`
					); // add file extension to links
				} catch (e) {
					console.error(`Failed to fetch attachment ${mediaLink}`, e);
				}
			})
		);
	}
	
	// save note
	noteFolder.file(`${title}.md`, md);
}

function convertMediaLinks(content: string) {
	// example: ![alt](https://example.com/image.png "title")
	// the alt and title are optional
	// $1 = alt, $2 = url, $3 = title without quotes
	const imageRegex = /!\[(.*?)\]\((\S*?)\s*("(.*?)")?\)/g;
	const imageHtmlRegex = /<img .*?src="(.*?)"(.*?)>/g;
	const videoRegex = /<video .*?src="(.*?)"(.*?)><\/video>/g;
	const audioRegex = /<audio .*?src="(.*?)"(.*?)><\/audio>/g;

	const protocols = ["https://", "http://", "ipfs://"];

	// Array to store all the media links
	const mediaLinks: string[] = [];

	content = content.replace(imageRegex, (match, alt, url, title) => {
		const oUrl = url;
		mediaLinks.push(url);
		let fileName = title ? title : url.split("/").pop();
		fileName = fileName.replace(/\s+/g, "_");
		protocols.forEach((protocol) => {
			url = url.replace(protocol, "./attachments/");
		});
		return match.replace(oUrl, `./attachments/${fileName}`);
	});

	const replacer = (match: string, url: any) => {
		const oUrl = url;
		mediaLinks.push(url);
		let fileName = url.split("/").pop();
		fileName = fileName.replace(/\s+/g, "_");
		protocols.forEach((protocol) => {
			url = url.replace(protocol, "./attachments/");
		});
		return match.replace(oUrl, `./attachments/${fileName}`);
	};

	content = content.replace(imageHtmlRegex, replacer);

	content = content.replace(videoRegex, replacer);

	content = content.replace(audioRegex, replacer);

	return { content, mediaLinks };
}

function downloadFile(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
}
