import type { NextPage } from "next";
import Head from "next/head";
import Home from "../components/Home";
import Footer from "../components/Home/Footer";

const Page: NextPage = () => {
	return (
		<div className="min-h-screen flex flex-col justify-center items-center">
			<Head>
				<title>Export Crossbell Data</title>
				<meta name="description" content="Export your crossbell data" />
				<link rel="icon" href="/favicon.ico" />
			</Head>

			<Home />

			<Footer />
		</div>
	);
};

export default Page;
