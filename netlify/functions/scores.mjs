// 통일집 한우 굽기 마스터 - 실시간 랭킹 API
// GET  /api/scores  -> TOP 10
// POST /api/scores  {name, score} -> 저장 후 TOP 10 + 내 순위
import { getStore } from "@netlify/blobs";

const KEY = "top";
const MAX_KEEP = 50;     // 저장해둘 기록 수
const MAX_SCORE = 1000;  // 30초에 나올 수 없는 점수는 거부

const clean = (s) =>
  String(s || "").replace(/[<>"'&\\/`]/g, "").replace(/\s+/g, " ").trim().slice(0, 8) || "익명손님";

export default async (req) => {
  const store = getStore("tongiljip-hanwoo");
  const headers = { "Cache-Control": "no-store" };
  let list = (await store.get(KEY, { type: "json" })) || [];

  if (req.method === "GET") {
    return Response.json({ top: list.slice(0, 10) }, { headers });
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
    const score = Math.floor(Number(body.score));
    if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
      return new Response("bad score", { status: 400 });
    }
    const entry = { name: clean(body.name), score, at: Date.now() };
    list.push(entry);
    list.sort((a, b) => b.score - a.score || a.at - b.at);
    const rank = list.indexOf(entry) + 1;
    list = list.slice(0, MAX_KEEP);
    await store.setJSON(KEY, list);
    return Response.json({ top: list.slice(0, 10), rank }, { headers });
  }

  return new Response("method not allowed", { status: 405 });
};

export const config = { path: "/api/scores" };
