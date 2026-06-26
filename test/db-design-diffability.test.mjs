// intent-db-design-seam 突合可能性スモークテスト (task 4.3 / R4 受け入れ条件・node:test 標準)。
//
// 目的: db-design-projection.md が定める出力形式（`## テーブル:` 見出し + `| カラム | 型 | 制約 | 由来 |`
//   4列表 + インデックス + 命名規則）が、後続 validate（別 spec）が実装スキーマ（migration/DDL）と
//   **項目単位で diff** できる構造を実際に満たすことを seam 内で一度実証する（形式 = 検査可能性の床）。
//
// 手法: スキル本体（LLM 指示文書）は実行できないため、projection.md の documented format で書いた
//   代表的な叩き台サンプルと、テーブル追加・カラム削除・制約変更を含むダミー実装スキーマを用意し、
//   両者を構造パースして「テーブル / カラム / 制約 / インデックス」の項目単位 diff が取れることを示す。
//   ここで実証するのは「形式が突合可能か」であって意味判断（正規化妥当性等）ではない（INV2）。
import { test } from "node:test";
import assert from "node:assert/strict";

// ---- 叩き台サンプル（projection.md の documented format） ----
// users（既存スキーマ由来）と orders（packet 由来）の2テーブル。
const DRAFT = `---
source_packet: "注文集計-packet"
generated_at: 2026-06-26T00:00:00Z
projection_sources: [packet, compass-invariant, existing-schema]
---

# DB 設計（叩き台）— 注文集計

> 派生物。これは設計の叩き台であって要件ではない。

## テーブル: users
- **由来**: 既存スキーマ由来
- **カラム**:
  | カラム | 型 | 制約 | 由来 |
  |---|---|---|---|
  | id | bigint | PK | 既存スキーマ |
  | email | text | NOT NULL, UNIQUE | 既存スキーマ |
  | name | text | NOT NULL | 既存スキーマ |
- **インデックス**: email (unique・既存スキーマ)
- **命名規則**: スネークケース・既存スキーマ

## テーブル: orders
- **由来**: packet 由来
- **カラム**:
  | カラム | 型 | 制約 | 由来 |
  |---|---|---|---|
  | id | bigint | PK | inferred |
  | user_id | bigint | NOT NULL, FK→users | packet 4.1 |
  | total | numeric | NOT NULL | packet 4.2 |
- **インデックス**: user_id (btree・packet 4.1)
- **命名規則**: スネークケース・inferred

## inferred / unverified 一覧
- テーブル orders の id：射影元に根拠なし（inferred）
`;

// ---- ダミー実装スキーマ（DDL 風）。叩き台との既知の差分:
//   1. テーブル追加: payments（叩き台に無い）
//   2. カラム削除: users.name（叩き台にあるが実装に無い）
//   3. 制約変更: orders.total が NOT NULL → NOT NULL かつ CHECK (total >= 0)
const IMPL_DDL = `
CREATE TABLE users (
  id bigint PRIMARY KEY,
  email text NOT NULL UNIQUE
);
CREATE TABLE orders (
  id bigint PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users,
  total numeric NOT NULL CHECK (total >= 0)
);
CREATE TABLE payments (
  id bigint PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES orders
);
`;

// ---- 叩き台パーサ: `## テーブル:` 見出し + 4列カラム表を項目単位で抽出 ----
function parseDraft(md) {
  const tables = {};
  const lines = md.split("\n");
  let cur = null;
  for (const line of lines) {
    const h = line.match(/^##\s+テーブル:\s+(\S+)/);
    if (h) {
      cur = h[1];
      tables[cur] = { columns: {}, indexes: [] };
      continue;
    }
    if (!cur) continue;
    // カラム表の行（ヘッダ行と区切り行は除外）。
    const row = line.match(/^\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/);
    if (row) {
      const col = row[1];
      if (col === "カラム" || /^-+$/.test(col)) continue;
      tables[cur].columns[col] = { type: row[2], constraints: row[3], source: row[4] };
    }
    const idx = line.match(/^\s*-\s*\*\*インデックス\*\*:\s*(.+)$/);
    if (idx) tables[cur].indexes.push(idx[1].trim());
  }
  return tables;
}

// トップレベル（括弧の外）のカンマでのみ分割する。`CHECK (total >= 0)` のように
// 括弧内にカンマや式があっても1カラム定義を割らない。
function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const ch of body) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

// ---- 実装スキーマパーサ: CREATE TABLE をテーブル/カラム/制約単位で抽出 ----
function parseDDL(ddl) {
  const tables = {};
  // テーブル本体は文終端 `);` まで取る（CHECK 式内の `;` で切れない・括弧対応で末尾 `)` を確定）。
  const re = /CREATE TABLE (\w+)\s*\(([\s\S]*?)\)\s*;/g;
  let m;
  while ((m = re.exec(ddl))) {
    const name = m[1];
    tables[name] = { columns: {} };
    for (const raw of splitTopLevel(m[2])) {
      const def = raw.trim().replace(/\s+/g, " ");
      if (!def) continue;
      const cm = def.match(/^(\w+)\s+(\w+)\s*(.*)$/);
      if (!cm) continue;
      tables[name].columns[cm[1]] = { type: cm[2], constraints: cm[3] };
    }
  }
  return tables;
}

// 制約文字列を正規化したトークン集合へ落とす。叩き台（`NOT NULL, FK→users`）と
// 実装 DDL（`NOT NULL REFERENCES users`）の表記差を吸収し、制約の有無を項目単位で比較する。
function constraintTokens(raw) {
  const s = raw.toUpperCase();
  const tokens = new Set();
  if (/\bPRIMARY KEY\b|\bPK\b/.test(s)) tokens.add("PK");
  if (/\bNOT NULL\b/.test(s)) tokens.add("NOT NULL");
  if (/\bUNIQUE\b/.test(s)) tokens.add("UNIQUE");
  if (/\bCHECK\b/.test(s)) tokens.add("CHECK");
  if (/\bFK\b|→|\bREFERENCES\b|\bFOREIGN KEY\b/.test(s)) tokens.add("FK");
  if (/\bDEFAULT\b/.test(s)) tokens.add("DEFAULT");
  return tokens;
}

// ---- diff: テーブル / カラム / 制約を項目単位で突合 ----
function diff(draft, impl) {
  const tablesAdded = Object.keys(impl).filter((t) => !(t in draft));
  const tablesRemoved = Object.keys(draft).filter((t) => !(t in impl));
  const columnChanges = [];
  for (const t of Object.keys(draft)) {
    if (!(t in impl)) continue;
    const dCols = draft[t].columns;
    const iCols = impl[t].columns;
    for (const c of Object.keys(dCols)) {
      if (!(c in iCols)) columnChanges.push({ table: t, column: c, kind: "removed-in-impl" });
    }
    for (const c of Object.keys(iCols)) {
      if (!(c in dCols)) columnChanges.push({ table: t, column: c, kind: "added-in-impl" });
    }
    // 制約変更（両方に在るカラムで制約トークン集合が異なる）。
    // CHECK だけでなく NOT NULL / UNIQUE / FK 等も項目単位で拾えるよう、制約文字列を
    // トークン化して集合差分で比較する（CHECK 限定にすると R4.1/R4.2 の主張が CHECK のみに矮小化する）。
    for (const c of Object.keys(dCols)) {
      if (!(c in iCols)) continue;
      const dTokens = constraintTokens(dCols[c].constraints);
      const iTokens = constraintTokens(iCols[c].constraints);
      const changed =
        [...dTokens].some((tk) => !iTokens.has(tk)) ||
        [...iTokens].some((tk) => !dTokens.has(tk));
      if (changed) columnChanges.push({ table: t, column: c, kind: "constraint-changed" });
    }
  }
  return { tablesAdded, tablesRemoved, columnChanges };
}

test("4.3: 叩き台と実装スキーマがテーブル/カラム/制約の項目単位で diff できる (R4.1/R4.2)", () => {
  const draft = parseDraft(DRAFT);
  const impl = parseDDL(IMPL_DDL);

  // パースが突合単位（テーブル＝見出し・カラム＝表の行）を identify できている。
  assert.deepEqual(Object.keys(draft).sort(), ["orders", "users"], "叩き台のテーブル見出しが識別できる");
  assert.deepEqual(
    Object.keys(draft.users.columns).sort(),
    ["email", "id", "name"],
    "叩き台 users のカラム行が識別できる",
  );
  assert.deepEqual(Object.keys(impl).sort(), ["orders", "payments", "users"], "実装のテーブルが識別できる");

  const d = diff(draft, impl);

  // 既知差分1: テーブル追加 payments を項目単位で検出。
  assert.deepEqual(d.tablesAdded, ["payments"], "実装で追加されたテーブルを検出する");
  assert.deepEqual(d.tablesRemoved, [], "叩き台にしか無いテーブルは無い");

  // 既知差分2: カラム削除 users.name を項目単位で検出。
  assert.ok(
    d.columnChanges.some((c) => c.table === "users" && c.column === "name" && c.kind === "removed-in-impl"),
    "実装で削除されたカラム users.name を検出する",
  );

  // 既知差分3: 制約変更 orders.total（CHECK 追加）を項目単位で検出。
  assert.ok(
    d.columnChanges.some((c) => c.table === "orders" && c.column === "total" && c.kind === "constraint-changed"),
    "実装で変わった制約 orders.total を検出する",
  );
});

test("4.3: 制約 diff は CHECK に限らず NOT NULL / UNIQUE / FK の変化も項目単位で拾う (R4.1/R4.2)", () => {
  // 制約語彙を限定せず突合できることを直接実証する（CHECK 限定で主張を矮小化しない）。
  // 各ケースは「叩き台の制約表記」と「実装 DDL の制約表記」の表記差を跨いでも検出されること。
  const cases = [
    { draft: "NOT NULL", impl: "", change: "NOT NULL 削除" },
    { draft: "", impl: "UNIQUE", change: "UNIQUE 追加" },
    { draft: "NOT NULL", impl: "NOT NULL UNIQUE", change: "UNIQUE 追加（NOT NULL 据え置き）" },
    { draft: "NOT NULL, FK→users", impl: "NOT NULL", change: "FK 削除（表記差を跨ぐ）" },
    { draft: "NOT NULL", impl: "NOT NULL CHECK (x >= 0)", change: "CHECK 追加" },
  ];
  for (const { draft, impl, change } of cases) {
    const d = constraintTokens(draft);
    const i = constraintTokens(impl);
    const changed = [...d].some((tk) => !i.has(tk)) || [...i].some((tk) => !d.has(tk));
    assert.ok(changed, `制約変更「${change}」が項目単位で検出される (draft="${draft}" impl="${impl}")`);
  }
  // 逆に、表記差はあるが意味的に同一な制約は「変更なし」と判定する（誤検出しない）。
  assert.deepEqual(
    [...constraintTokens("NOT NULL, FK→users")].sort(),
    [...constraintTokens("NOT NULL REFERENCES users")].sort(),
    "叩き台 FK→ と DDL REFERENCES が同一トークンに正規化される（表記差で誤検出しない）",
  );
});

test("4.3: インデックスも項目単位で diff できる（突合単位として抽出され差分が取れる）(R4.1)", () => {
  const draft = parseDraft(DRAFT);
  // 各テーブルのインデックス記述が突合可能な単位として抽出されている。
  assert.ok(draft.users.indexes.length >= 1, "users のインデックス記述が抽出される");
  assert.ok(draft.orders.indexes.some((i) => i.includes("user_id")), "orders のインデックス対象列が識別できる");

  // 叩き台にあるインデックス対象列を実装側インデックス集合と項目単位で diff できることを示す。
  // ダミー実装は orders(user_id) のインデックスを持たない想定 → 「叩き台にあり実装に無い」を検出する。
  const draftIndexCols = new Set(
    Object.values(draft).flatMap((t) =>
      t.indexes.map((i) => (i.match(/(\w+)\s*\(/) || [, i.trim().split(/\s/)[0]])[1]),
    ),
  );
  const implIndexCols = new Set(["email"]); // 実装は email(unique) のみインデックス化（user_id は未索引）。
  const indexesMissingInImpl = [...draftIndexCols].filter((col) => !implIndexCols.has(col));
  assert.ok(
    indexesMissingInImpl.includes("user_id"),
    "叩き台にあり実装に無いインデックス（orders.user_id）を項目単位で検出する",
  );
});
