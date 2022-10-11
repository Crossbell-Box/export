import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
	render() {
		return (
			<Html>
				<Head>
					{/* <link rel="preconnect" href="https://fonts.bunny.net" />
					<link
						href="https://fonts.bunny.net/css?family=lexend-deca:100,200,300,400,500,600,700,800,900|roboto:100,100i,300,300i,400,400i,500,500i,700,700i,900,900i"
						rel="stylesheet"
					/> */}
				</Head>
				<body>
					<Main />
					<NextScript />
				</body>
			</Html>
		);
	}
}

export default MyDocument;
