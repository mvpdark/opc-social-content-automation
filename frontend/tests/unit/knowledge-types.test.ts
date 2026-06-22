import { describe, it, expect } from "vitest";
import {
  isKnowledgeItem,
  knowledgeCategoryLabel,
  knowledgeItemTitle,
  knowledgeItemExcerpt,
  type KnowledgeItem,
} from "@/lib/knowledge-types";

describe("knowledge-types", () => {
  const validItem: KnowledgeItem = {
    id: 1,
    title: "测试知识条目",
    content: "这是测试内容",
    category: "trend-insight",
  };

  describe("isKnowledgeItem", () => {
    it("returns true for valid knowledge item", () => {
      expect(isKnowledgeItem(validItem)).toBe(true);
    });

    it("returns false for null", () => {
      expect(isKnowledgeItem(null)).toBe(false);
    });

    it("returns false for object missing required fields", () => {
      expect(isKnowledgeItem({ id: 1, title: "test" })).toBe(false);
    });

    it("returns false for non-object", () => {
      expect(isKnowledgeItem("string")).toBe(false);
    });
  });

  describe("knowledgeCategoryLabel", () => {
    it("returns label for known category", () => {
      expect(knowledgeCategoryLabel("trend-insight")).toBe("趋势摘要");
    });

    it("returns '未分类' for null", () => {
      expect(knowledgeCategoryLabel(null)).toBe("未分类");
    });

    it("returns original value for unknown category", () => {
      expect(knowledgeCategoryLabel("custom-cat")).toBe("custom-cat");
    });
  });

  describe("knowledgeItemTitle", () => {
    it("returns cleaned title", () => {
      const item = { ...validItem, title: "趋势摘要：测试标题" };
      expect(knowledgeItemTitle(item)).toBe("测试标题");
    });

    it("returns '未命名知识' for empty title", () => {
      const item = { ...validItem, title: "   " };
      expect(knowledgeItemTitle(item)).toBe("未命名知识");
    });
  });

  describe("knowledgeItemExcerpt", () => {
    it("returns full content when shorter than maxLength", () => {
      expect(knowledgeItemExcerpt(validItem, 100)).toBe("这是测试内容");
    });

    it("truncates content with ellipsis", () => {
      const longContent = "A".repeat(200);
      const item = { ...validItem, content: longContent };
      const excerpt = knowledgeItemExcerpt(item, 50);
      expect(excerpt.length).toBeLessThanOrEqual(53);
      expect(excerpt.endsWith("...")).toBe(true);
    });
  });
});
