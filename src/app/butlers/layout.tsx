import { Header } from "@/components/landing/Header";

export default function ButlersLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Header />
            {children}
        </>
    );
}
