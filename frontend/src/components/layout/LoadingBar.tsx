import { useEffect } from "react";
import { useNavigation } from "react-router-dom";
import nprogress from "nprogress";
import "nprogress/nprogress.css";

nprogress.configure({
    showSpinner: false,
    trickleSpeed: 200,
    minimum: 0.08
});

export default function LoadingBar() {
    const navigation = useNavigation();

    useEffect(() => {
        const isLoading = navigation.state === "loading" || navigation.state === "submitting";

        if (isLoading) {
            nprogress.start();
        } else {
            nprogress.done();
        }

        return () => {
            nprogress.done();
        };
    }, [navigation.state]);

    return null;
}
