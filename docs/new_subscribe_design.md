你的 schema 其实已经接近一个 **完整的“学习卡组 + 商店订阅系统”架构**了 👍
我给你设计一个 **Supabase / Postgres 最佳实践版本**，解决几个关键问题：

1️⃣ 订阅计数如何正确更新
2️⃣ 如何避免 trigger 全表扫描
3️⃣ 如何正确区分 **用户卡组 vs 商店卡组**
4️⃣ 如何设计 **订阅关系**（现在其实缺一张表）

---

# 一、先看你现在的结构

你现在逻辑大概是：

### 用户卡组

```
decks
cards
```

### 商店卡组

```
store_decks
store_cards
```

### 学习

```
study_logs
challenge_logs
```

但有一个 **重要缺失**：

❌ **没有“用户订阅商店卡组”的关系表**

你现在是用：

```
decks.title = store_decks.title
```

去统计订阅数，这会有很多问题：

* title 可以重复
* 改名会崩
* 统计很慢
* 逻辑不清晰

---

# 二、正确的订阅系统设计（推荐）

新增一张表：

```sql
store_deck_subscriptions
```

结构：

```sql
CREATE TABLE public.store_deck_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_deck_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),

  UNIQUE(user_id, store_deck_id),

  FOREIGN KEY (user_id) REFERENCES profiles(id),
  FOREIGN KEY (store_deck_id) REFERENCES store_decks(id)
);
```

意义：

```
一个用户订阅一个商店卡组
```

数据示例：

| user_id | store_deck_id |
| ------- | ------------- |
| u1      | deckA         |
| u2      | deckA         |
| u3      | deckA         |

订阅数：

```
3
```

---

# 三、subscriber_count 正确设计

你现在：

```
store_decks.subscriber_count
```

保留是对的（避免每次 count）。

但更新方式应该是：

**触发 subscription 表变化**

而不是扫描 decks。

---

# 四、正确 trigger 设计

### 订阅增加

```sql
CREATE OR REPLACE FUNCTION increment_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE store_decks
  SET subscriber_count = subscriber_count + 1
  WHERE id = NEW.store_deck_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

trigger：

```sql
CREATE TRIGGER on_subscribe
AFTER INSERT ON store_deck_subscriptions
FOR EACH ROW
EXECUTE FUNCTION increment_subscriber_count();
```

---

### 取消订阅

```sql
CREATE OR REPLACE FUNCTION decrement_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE store_decks
  SET subscriber_count = subscriber_count - 1
  WHERE id = OLD.store_deck_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

trigger：

```sql
CREATE TRIGGER on_unsubscribe
AFTER DELETE ON store_deck_subscriptions
FOR EACH ROW
EXECUTE FUNCTION decrement_subscriber_count();
```

---

# 五、用户订阅流程

### 1 用户点击订阅

前端：

```ts
await supabase
  .from("store_deck_subscriptions")
  .insert({
    user_id: userId,
    store_deck_id: deckId
  })
```

数据库：

```
insert subscription
↓
trigger
↓
store_decks.subscriber_count +1
```

---

### 2 用户取消订阅

```ts
await supabase
  .from("store_deck_subscriptions")
  .delete()
  .eq("user_id", userId)
  .eq("store_deck_id", deckId)
```

trigger：

```
subscriber_count -1
```

---

# 六、用户复制卡组逻辑（推荐）

当用户订阅商店卡组时：

```
store_decks
      ↓
复制
      ↓
decks
```

并保存来源：

```
decks.source_store_deck_id
```

建议你在 `decks` 表加：

```sql
source_store_deck_id uuid
```

这样：

```
decks
|
|-- source_store_deck_id -> store_decks.id
```

就能知道用户卡组来源。

---

# 七、store_cards 复制逻辑

复制卡片：

```
store_cards
↓
cards
```

SQL 示例：

```sql
INSERT INTO cards (id, deck_id, text, translation)
SELECT
  gen_random_uuid(),
  'new_deck_id',
  text,
  translation
FROM store_cards
WHERE deck_id = 'store_deck_id';
```

---

# 八、最终推荐架构

```
profiles
   │
   │
decks  ← 用户卡组
   │
cards

store_decks  ← 商店卡组
   │
store_cards

store_deck_subscriptions  ← 订阅关系
```

关系：

```
store_decks
   ↑
store_deck_subscriptions
   ↓
profiles
```

---

# 九、你的原 trigger 应该删掉

你之前的：

```sql
UPDATE store_decks 
SET subscriber_count = (
  SELECT COUNT(*) FROM decks WHERE title = store_decks.title
);
```

问题：

❌ 无 WHERE
❌ 全表扫描
❌ title 逻辑错误
❌ 统计不准确

建议：

```
DROP TRIGGER ...
DROP FUNCTION ...
```

改用 **subscription 表 + trigger 计数**。

---

# 十、Supabase 项目最常见最佳实践

我给你一个经验总结：

| 需求          | 正确方案                 |
| ----------- | -------------------- |
| 订阅关系        | 单独表                  |
| 统计数量        | 触发器 + 计数             |
| 避免 count(*) | 维护缓存字段               |
| 复制卡组        | store → user         |
| 来源记录        | source_store_deck_id |

---

💡 如果你愿意，我可以 **帮你把整套 schema 优化成一个完整生产级版本**（大概 30 行 SQL 改动），包括：

* RLS policy
* 索引
* 订阅系统
* 热门卡组排序
* 推荐算法字段

这套结构在 **Supabase + React 项目里非常常见**，做好之后扩展会很轻松。
