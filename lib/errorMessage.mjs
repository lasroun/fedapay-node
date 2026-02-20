// err: any value (Error or other) — returns err.message or String(err)
export default (err) => err?.message ?? String(err);
