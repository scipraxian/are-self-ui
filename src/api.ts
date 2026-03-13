export function getCookie(name: string): string | null {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const options = init || {};
    const headers = new Headers(options.headers || {});

    // Automatically add CSRF token for mutating requests
    if (options.method && !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(options.method.toUpperCase())) {
        const csrfToken = getCookie('csrftoken');
        if (csrfToken && !headers.has('X-CSRFToken')) {
            headers.set('X-CSRFToken', csrfToken);
        }
    }

    const config: RequestInit = {
        ...options,
        headers,
    };

    // Ensure credentials array gets pulled from django
    if (config.credentials === undefined) {
        config.credentials = 'include';
    }

    return fetch(input, config);
}
