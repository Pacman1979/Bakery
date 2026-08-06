// Cloudflare Pages Function — /api/ideas
// Reads and writes a shared JSON list stored in a Cloudflare KV namespace
// bound to this project as "IDEAS_KV" (see setup instructions).

const KEY = "ideas";

async function readIdeas(env) {
  const raw = await env.IDEAS_KV.get(KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeIdeas(env, ideas) {
  await env.IDEAS_KV.put(KEY, JSON.stringify(ideas));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });
}

export async function onRequestGet({ env }) {
  try {
    const ideas = await readIdeas(env);
    // newest first
    ideas.sort((a, b) => new Date(b.created) - new Date(a.created));
    return json(ideas);
  } catch (err) {
    return json({ error: "Could not load ideas." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const text = (body.text || "").trim();
    const author = (body.author || "").trim() || "Someone";
    if (!text) return json({ error: "Idea text is required." }, 400);
    if (text.length > 2000) return json({ error: "That's a bit long — keep it under 2000 characters." }, 400);

    const ideas = await readIdeas(env);
    const idea = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      author: author.slice(0, 60),
      text: text.slice(0, 2000),
      created: new Date().toISOString()
    };
    ideas.push(idea);
    await writeIdeas(env, ideas);
    return json(idea, 201);
  } catch (err) {
    return json({ error: "Could not save that idea." }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    const body = await request.json();
    const id = body.id;
    if (!id) return json({ error: "Missing id." }, 400);
    const ideas = await readIdeas(env);
    const next = ideas.filter((i) => i.id !== id);
    await writeIdeas(env, next);
    return json({ success: true });
  } catch (err) {
    return json({ error: "Could not delete that idea." }, 500);
  }
}
