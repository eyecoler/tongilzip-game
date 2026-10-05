// 통일집 게임센터 - 실시간 랭킹 API
// GET  /api/scores?game=grade  -> TOP 10
// POST /api/scores  {name, score, game} -> 저장 후 TOP 10 + 내 순위
import { getStore } from "@netlify/blobs";

const MAX_KEEP = 50;
const MAX_SCORE = 1000;
const GAMES = { top: "top", grade: "grade" };   // 허용된 게임 키

const keyOf = (g) => GAMES[String(g || "top")] || "top";
const clean = (s) =>
  String(s || "").replace(/[<>"'&\\/`]/g, "").replace(/\s+/g, " ").trim().slice(0, 8) || "익명손님";

export default async (req) => {
  const store = getStore("tongiljip-hanwoo");
  const headers = { "Cache-Control": "no-store" };
  const url = new URL(req.url);

  if (req.method === "GET") {
    const list = (await store.get(keyOf(url.searchParams.get("game")), { type: "json" })) || [];
    return Response.json({ top: list.slice(0, 10) }, { headers });
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
    const score = Math.floor(Number(body.score));
    if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
      return new Response("bad score", { status: 400 });
    }
    const key = keyOf(body.game);
    let list = (await store.get(key, { type: "json" })) || [];
    const entry = { name: clean(body.name), score, at: Date.now() };
    list.push(entry);
    list.sort((a, b) => b.score - a.score || a.at - b.at);
    const rank = list.indexOf(entry) + 1;
    list = list.slice(0, MAX_KEEP);
    await store.setJSON(key, list);
    return Response.json({ top: list.slice(0, 10), rank }, { headers });
  }

  return new Response("method not allowed", { status: 405 });
};

export const config = { path: "/api/scores" };
