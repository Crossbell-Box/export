import classNames from "classnames";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { exportDataOfCharacter } from "../../utils/api/export";

export default function Home() {
	// handle
	const router = useRouter();
	const qHandle = router.query.handle as string;
	const [handle, setHandle] = useState(qHandle);
	useEffect(() => {
		setHandle(qHandle);
	}, [qHandle]);

	// options
	const [options, setOptions] = useState({
		notesInMarkdown: false,
	});

	// export
	const [status, setStatus] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");
	const [message, setMessage] = useState("");
	const [progress, setProgress] = useState(0);
	const handleExportData = useCallback(async () => {
		try {
			setStatus("loading");
			setMessage("");
			await exportDataOfCharacter(handle, {
				onProgress: (progress, statusText) => {
					setProgress(progress);
					setMessage(statusText);
				},
				exportNotesInMarkdown: options.notesInMarkdown,
			});
			setStatus("success");
			setMessage("Success!");
		} catch (e: any) {
			setStatus("error");
			setMessage(e.message);
		}
	}, [handle]);

	// input
	const handleInputHandle = useCallback((e: any) => {
		setHandle(e.target.value);
		setStatus("idle");
		setMessage("");
	}, []);

	return (
		<main className="container mx-auto flex flex-col justify-center items-center">
			<h1 className="text-3xl font-semibold">Export Crossbell Data</h1>
			<p className="my-4">You own your data.</p>

			{/* form */}
			<section className="form-control w-full max-w-xs">
				<input
					type="text"
					placeholder="Type your handle here"
					className="input input-bordered w-full max-w-xs"
					maxLength={32}
					value={handle}
					onChange={handleInputHandle}
					disabled={status === "loading"}
				/>

				<div className="my-2"></div>

				<label className="label cursor-pointer">
					<span className="label-text text-xs">
						Also export notes in markdown files
					</span>
					<input
						type="checkbox"
						className="toggle toggle-primary"
						checked={options.notesInMarkdown}
						onChange={(e) =>
							setOptions((v) => ({
								...v,
								notesInMarkdown: e.target.checked,
							}))
						}
						disabled={status === "loading"}
					/>
				</label>

				<div className="my-2"></div>

				<button
					className={classNames("btn btn-primary", {
						"btn-disabled": !handle,
						loading: status === "loading",
					})}
					onClick={handleExportData}
				>
					{status === "loading" ? `Export (${progress * 100}%)` : "Export"}
				</button>

				<div className="my-2"></div>

				{/* progress */}
				{status !== "idle" && (
					<progress
						className={classNames("progress w-full transition-colors", {
							"progress-primary": status === "loading",
							"progress-success": status === "success",
							"progress-error": status === "error",
						})}
						value={progress * 100}
						max="100"
					></progress>
				)}

				{/* message */}
				{message && (
					<div
						className={classNames("text-xs", {
							"text-error": status === "error",
							"text-success": status === "success",
						})}
					>
						{message}
					</div>
				)}
			</section>
		</main>
	);
}
