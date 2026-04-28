// Injects the build SHA at runtime so the same image is reusable across envs.
fetch('/build.json', { cache: 'no-cache' })
	.then((r) => (r.ok ? r.json() : { sha: 'dev' }))
	.then((b) => {
		const el = document.getElementById('build');
		if (el) el.textContent = b.sha || 'dev';
	})
	.catch(() => {});
