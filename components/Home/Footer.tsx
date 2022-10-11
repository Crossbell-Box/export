export default function Footer() {
	return (
		<footer className="fixed bottom-5 left-0 right-0 text-center">
			<nav className="flex flex-row justify-center space-x-5">
				<a
					className="link link-hover"
					href="https://crossbell.io"
					target="_blank"
					rel="noopener noreferrer"
				>
					Crossbell.io
				</a>

				<a
					className="link link-hover"
					href="https://github.com/Crossbell-Box/export"
					target="_blank"
					rel="noopener noreferrer"
				>
					Source
				</a>

				<a
					className="link link-hover"
					href="https://indexer.crossbell.io/docs"
					target="_blank"
					rel="noopener noreferrer"
				>
					Indexer API
				</a>
			</nav>
		</footer>
	);
}
