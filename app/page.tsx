import Footer from "@/components/Home/Footer";
import Form from "@/components/Home/Form";

export default function Page({
	searchParams,
}: {
	searchParams: { handle?: string; md?: string };
}) {
	return (
		<div className="min-h-screen flex flex-col justify-center items-center">
			<main className="container mx-auto flex flex-col justify-center items-center">
				<h1 className="text-3xl font-semibold">Export Crossbell Data</h1>
				<p className="my-4">You own your data.</p>

				<Form handle={searchParams.handle} md={searchParams.md} />
			</main>

			<Footer />
		</div>
	);
}
