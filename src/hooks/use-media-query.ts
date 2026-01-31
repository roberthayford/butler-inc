import * as React from "react";

export function useMediaQuery(query: string) {
    const [matches, setMatches] = React.useState<boolean>(false);

    React.useEffect(() => {
        const mql = window.matchMedia(query);
        const onChange = (e: MediaQueryListEvent) => {
            setMatches(e.matches);
        };

        // Set initial value
        setMatches(mql.matches);

        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, [query]);

    return matches;
}
