(function () {
    window.csrfFetch = async function (url, options = {}) {
        const method = (options.method || "GET").toUpperCase();

        if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
            const csrfToken =
    document.querySelector('meta[name="csrf-token"]')?.content;

            options.headers = {
                ...(options.headers || {}),
                "x-csrf-token": csrfToken,
            };
        }

        return fetch(url, options);
    };
})();